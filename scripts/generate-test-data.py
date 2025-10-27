import json
import os
import requests
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configure basic logging for clearer diagnostics and progress visibility
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

TERM_CODE = "20261"

try:
    response = requests.get(
        f"https://classes.usc.edu/api/Schools/TermCode?termCode={TERM_CODE}",
        timeout=60,
    )
    response.raise_for_status()
    data = response.json()
except Exception as error:
    logging.error(f"Failed to fetch schools for term {TERM_CODE}: {error}")
    raise

output = {"schools": [], "success": True}

# Append General Education school and default GESM program
output["schools"].append({
    "name": "General Education",
    "prefix": "GE",
    "programs": [
        {"name": "GE Seminar", "prefix": "GESM"}
    ]
})

for school in data:
    programs = []
    for program in school["programs"]:
        programs.append({
            "name": program["name"],
            "prefix": program["prefix"]
        })

    output["schools"].append({
        "name": school["name"],
        "prefix": school["prefix"],
        "programs": programs
    })

# Ensure term-specific directory exists
term_dir = os.path.join("..", "public", "data", TERM_CODE)
os.makedirs(term_dir, exist_ok=True)

with open(os.path.join(term_dir, "programs.json"), "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

logging.info("Program data generated successfully, gathering data for courses…")


def _safe_course_code(course, preferred_prefix=None):
    """
    Choose a stable course code (courseHyphen) with preference for the requested program's prefix.

    Preference order:
    1) Any code whose prefix matches preferred_prefix (if provided)
    2) scheduledCourseCode
    3) matchedCourseCode
    4) publishedCourseCode
    Returns the first non-empty courseHyphen found.
    """
    try:
        scheduled = course.get("scheduledCourseCode") or {}
        matched = course.get("matchedCourseCode") or {}
        published = course.get("publishedCourseCode") or {}

        candidates = [scheduled, matched, published]
        if preferred_prefix:
            for c in candidates:
                if (c or {}).get("prefix") == preferred_prefix and c.get("courseHyphen"):
                    return c.get("courseHyphen")
        for c in candidates:
            if c.get("courseHyphen"):
                return c.get("courseHyphen")
    except Exception as error:
        logging.debug(f"Failed to resolve course code: {error}")
    return None


def _parse_units(units_value):
    """
    Normalize units to a number when possible; otherwise keep the original string.
    Accepts list/str/number, handles values like "4.0", 4, ["4"], [4], etc.
    Leaves ranges (e.g., "2-4") or non-numeric values as strings.
    """
    if units_value is None:
        return None
    try:
        value = units_value
        if isinstance(value, list):
            value = value[0] if value else None
        if value is None:
            return None
        if isinstance(value, (int, float)):
            # Coerce 4.0 -> 4 when exact integer
            return int(value) if float(value).is_integer() else float(value)
        if isinstance(value, str):
            text = value.strip()
            # Skip clear ranges like "2-4" or "1–4"
            if "-" in text or "–" in text:
                return text
            # Remove trailing .0 for cleanliness when safe to do
            try:
                num = float(text)
                return int(num) if num.is_integer() else num
            except Exception:
                return text
        return value
    except Exception:
        return units_value


_DAY_NAME_TO_ABBR = {
    "Mon": "M",
    "Tue": "Tu",
    "Wed": "W",
    "Thu": "Th",
    "Fri": "F",
    "Sat": "Sa",
    "Sun": "Su",
}


def _format_days(days_list, fallback_day_code):
    """
    Build a compact day string like "TuTh" from a list of day names.
    If days_list is empty, attempt to use fallback_day_code with a small fix
    for Thursday (H -> Th). Returns None if nothing can be formed.
    """
    try:
        days_list = days_list or []
        if days_list:
            abbrs = [_DAY_NAME_TO_ABBR.get(d, d[:2]) for d in days_list if d]
            return "".join(abbrs) if abbrs else None
        code = (fallback_day_code or "").strip().upper()
        if not code:
            return None
        # Replace the standalone "H" with "Th" for Thursday
        # e.g., TH -> TTh, H -> Th
        code = code.replace("H", "Th")
        return code
    except Exception:
        return None


def _format_time(schedule_entries):
    """
    Produce a human-friendly time string from schedule entries.
    If multiple distinct meeting times exist, return the first, plus a "+N" indicator.
    """
    try:
        schedule_entries = schedule_entries or []
        if not schedule_entries:
            return "TBA"
        formatted = []
        for entry in schedule_entries:
            days = entry.get("days") or []
            day_code = entry.get("dayCode")
            start = entry.get("startTime") or ""
            end = entry.get("endTime") or ""
            day_str = _format_days(days, day_code) or ""
            if not (day_str or start or end):
                continue
            if start and end:
                formatted.append(f"{day_str} {start} - {end}".strip())
            elif start:
                formatted.append(f"{day_str} {start}".strip())
            else:
                formatted.append(day_str)
        if not formatted:
            return "TBA"
        # If there are multiple distinct meeting patterns, show the first and count remainder
        unique = []
        seen = set()
        for f in formatted:
            if f not in seen:
                unique.append(f)
                seen.add(f)
        if len(unique) == 1:
            return unique[0]
        return f"{unique[0]} (+{len(unique) - 1} more)"
    except Exception:
        return "TBA"


def _split_duplicate_credit(text):
    """
    Split duplicate credit strings on common separators.
    """
    if not isinstance(text, str):
        return []
    parts = []
    for chunk in text.replace("/", ",").replace(";", ",").split(","):
        for sub in chunk.split(" and "):
            value = sub.strip()
            if value:
                parts.append(value)
    return parts

def process_course(course, preferred_prefix=None):
    sections_output = []
    sections = course.get("sections") or []
    for section in sections:
        try:
            if section.get("isCancelled"):
                continue

            schedule_entries = section.get("schedule") or []
            first_schedule = schedule_entries[0] if len(schedule_entries) > 0 else {}

            units_value = _parse_units(section.get("units"))

            duplicate_credit_value = course.get("duplicateCredit") or ""
            duplicated_credits_list = _split_duplicate_credit(duplicate_credit_value)

            prerequisite_codes = course.get("prerequisiteCourseCodes") or []
            prerequisites_list = []
            for prerequisite in prerequisite_codes:
                try:
                    options = prerequisite.get("courseOptions") or []
                    if not options:
                        continue
                    code = (options[0] or {}).get("courseHyphen")
                    if code:
                        prerequisites_list.append(code)
                except Exception:
                    continue

            instructors = []
            for instructor in section.get("instructors") or []:
                first_name = (instructor or {}).get("firstName") or ""
                last_name = (instructor or {}).get("lastName") or ""
                full_name = (first_name + " " + last_name).strip()
                if full_name:
                    instructors.append(full_name)

            course_code = _safe_course_code(course, preferred_prefix)

            title_value = (
                section.get("name")
                or course.get("name")
                or course.get("fullCourseName")
                or ((course.get("publishedCourseCode") or {}).get("courseSpace"))
            )
            description_value = course.get("description")

            time_string = _format_time(schedule_entries)

            sections_output.append({
                "title": title_value,
                "description": description_value,
                "courseCode": course_code,
                "section": {
                    "sectionCode": section.get("sisSectionId"),
                    "instructors": instructors,
                    "units": units_value,
                    "total": section.get("totalSeats"),
                    "registered": section.get("registeredSeats"),
                    "location": first_schedule.get("location"),
                    "time": time_string,
                    "duplicatedCredits": duplicated_credits_list,
                    "prerequisites": prerequisites_list,
                    "dClearance": section.get("hasDClearance"),
                    "type": section.get("rnrMode"),
                },
            })
        except Exception as error:
            logging.warning(f"Skipping problematic section due to error: {error}")

    return sections_output

# {"[SCHOOL-CODE]": {"[PROGRAM-CODE]": [processed courses]}}
# processed courses: [{"title", "description", "courseCode", "sections": [{"sectionCode", "instructors", "units", "total", "registered", "location", "time", "duplicatedCredits", "prerequisites", "dClearance", "type"}]}]

def get_courses(school_code, program_code):
    last_error = None
    for attempt_index in range(1, 5):  # initial try + 3 retries
        try:
            response = requests.get(
                f"https://classes.usc.edu/api/Courses/CoursesByTermSchoolProgram?termCode={TERM_CODE}&school={school_code}&program={program_code}",
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()

            # Aggregate sections by (title, description, courseCode)
            aggregation = {}
            for course in data.get("courses", []):
                processed_sections = process_course(course, preferred_prefix=program_code)
                for item in processed_sections:
                    title_value = item.get("title")
                    description_value = item.get("description")
                    course_code = item.get("courseCode")
                    key = (title_value, description_value, course_code)

                    if key not in aggregation:
                        aggregation[key] = {
                            "title": title_value,
                            "description": description_value,
                            "courseCode": course_code,
                            "sections": [],
                            "_seenSectionCodes": set(),
                        }

                    section_obj = item.get("section") or {}
                    section_code_value = section_obj.get("sectionCode")
                    seen_codes = aggregation[key]["_seenSectionCodes"]
                    if section_code_value and section_code_value in seen_codes:
                        continue

                    if section_code_value:
                        seen_codes.add(section_code_value)

                    aggregation[key]["sections"].append(section_obj)

            # Convert aggregation to list and drop helper field
            courses = []
            for grouped in aggregation.values():
                grouped.pop("_seenSectionCodes", None)
                courses.append(grouped)

            return courses
        except Exception as error:
            last_error = error
            if attempt_index < 4:
                wait_seconds = attempt_index * 5
                logging.warning(
                    f"Attempt {attempt_index} failed for {school_code}/{program_code}: {error}. Retrying in {wait_seconds}s…"
                )
                time.sleep(wait_seconds)
            else:
                break

    # If all attempts failed, re-raise the last error to be handled by caller
    raise last_error

# Now, process the courses for each school and program concurrently. After finished, write term-scoped json.

courses_by_school = {}

def fetch_program_courses(school_prefix, program_prefix):
    try:
        return (school_prefix, program_prefix, get_courses(school_prefix, program_prefix), None)
    except Exception as e:
        return (school_prefix, program_prefix, None, e)

tasks = []
with ThreadPoolExecutor(max_workers=12) as executor:
    for school in output.get("schools", []):
        school_prefix = school.get("prefix")
        if not school_prefix:
            continue
        if school_prefix == "GE":
            # Skip GE in normal catalog fetch; handled separately
            continue
        for program in school.get("programs", []):
            program_prefix = program.get("prefix")
            if not program_prefix:
                continue
            tasks.append(executor.submit(fetch_program_courses, school_prefix, program_prefix))

    for future in as_completed(tasks):
        school_prefix, program_prefix, courses, error = future.result()
        if error is not None:
            logging.error(f"Error fetching courses for {school_prefix}/{program_prefix}: {error}")
            continue

        if school_prefix not in courses_by_school:
            courses_by_school[school_prefix] = {}
        courses_by_school[school_prefix][program_prefix] = courses


# Build program -> school index for GE tagging
program_to_school = {}
for school in output.get("schools", []):
    s_prefix = school.get("prefix")
    for program in school.get("programs", []):
        p_prefix = program.get("prefix")
        if p_prefix:
            program_to_school[p_prefix] = s_prefix


def fetch_ge_courses(ge_type, category_prefix):
    last_error = None
    for attempt_index in range(1, 5):
        try:
            resp = requests.get(
                f"https://classes.usc.edu/api/Courses/GeCoursesByTerm?termCode={TERM_CODE}&geRequirementPrefix={ge_type}&categoryPrefix={category_prefix}",
                timeout=60,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as error:
            last_error = error
            if attempt_index < 4:
                wait_seconds = attempt_index * 5
                print(
                    f"Attempt {attempt_index} failed for GE {ge_type}/{category_prefix}: {error}. Retrying in {wait_seconds}s..."
                )
                time.sleep(wait_seconds)
            else:
                break
    raise last_error


def aggregate_grouped_from_courses(course_list, preferred_prefix=None):
    aggregation = {}
    for course in course_list or []:
        processed = process_course(course, preferred_prefix=preferred_prefix)
        for item in processed:
            key = (
                item.get("title"),
                item.get("description"),
                item.get("courseCode"),
            )
            if key not in aggregation:
                aggregation[key] = {
                    "title": item.get("title"),
                    "description": item.get("description"),
                    "courseCode": item.get("courseCode"),
                    "sections": [],
                    "_seenSectionCodes": set(),
                }
            section_obj = item.get("section") or {}
            section_code_value = section_obj.get("sectionCode")
            seen_codes = aggregation[key]["_seenSectionCodes"]
            if section_code_value and section_code_value in seen_codes:
                continue
            if section_code_value:
                seen_codes.add(section_code_value)
            aggregation[key]["sections"].append(section_obj)
    grouped = []
    for grouped_item in aggregation.values():
        grouped_item.pop("_seenSectionCodes", None)
        grouped.append(grouped_item)
    return grouped


def merge_group_into_target(target_list, grouped_item, ge_tags=None):
    ge_tags = ge_tags or []
    t_title = grouped_item.get("title")
    t_desc = grouped_item.get("description")
    t_code = grouped_item.get("courseCode")
    # find existing
    found = None
    for idx, existing in enumerate(target_list or []):
        if (
            existing.get("title") == t_title
            and existing.get("description") == t_desc
            and existing.get("courseCode") == t_code
        ):
            found = idx
            break
    if found is None:
        new_item = dict(grouped_item)
        if ge_tags:
            new_item["GE"] = list(sorted(set([str(x) for x in ge_tags])))
        target_list.append(new_item)
    else:
        existing = target_list[found]
        # merge sections unique by sectionCode
        seen = set()
        for s in existing.get("sections", []):
            c = s.get("sectionCode")
            if c:
                seen.add(c)
        for s in grouped_item.get("sections", []):
            c = s.get("sectionCode")
            if c and c in seen:
                continue
            if c:
                seen.add(c)
            existing.setdefault("sections", []).append(s)
        if ge_tags:
            existing_ge = set(existing.get("GE") or [])
            for t in ge_tags:
                existing_ge.add(str(t))
            existing["GE"] = list(sorted(existing_ge))


# Ingest GESM into GE/GESM
gesm_courses = []
try:
    gesm_payload = fetch_ge_courses("ACORELIT", "GESM")
    gesm_courses = aggregate_grouped_from_courses((gesm_payload or {}).get("courses", []), preferred_prefix="GESM")
    if gesm_courses:
        courses_by_school.setdefault("GE", {})["GESM"] = gesm_courses
        logging.info(f"Ingested GESM courses: {len(gesm_courses)}")
except Exception as e:
    logging.warning(f"Failed to ingest GESM via GE endpoint: {e}")

# Fallback: try normal program fetch for any school that has GESM
if not gesm_courses:
    owner_school = program_to_school.get("GESM")
    if owner_school:
        try:
            fallback_courses = get_courses(owner_school, "GESM")
            if fallback_courses:
                courses_by_school.setdefault("GE", {})["GESM"] = fallback_courses
                logging.info(f"Fallback ingested GESM via normal program: {len(fallback_courses)}")
        except Exception as e:
            logging.warning(f"Fallback GESM via normal program failed: {e}")


# Ingest other GE categories and tag original departments
GE_CATEGORY_MAP = [
    ("ACORELIT", "ARTS", "A"),
    ("ACORELIT", "HINQ", "B"),
    ("ACORELIT", "SANA", "C"),
    ("ACORELIT", "LIFE", "D"),
    ("ACORELIT", "PSC", "E"),
    ("ACORELIT", "QREA", "F"),
    ("AGLOPERS", "GPG", "G"),
    ("AGLOPERS", "GPH", "H"),
]

for ge_type, category_prefix, ge_letter in GE_CATEGORY_MAP:
    try:
        payload = fetch_ge_courses(ge_type, category_prefix)
        courses = (payload or {}).get("courses", [])
        # group per original department
        for course in courses:
            # determine original program and school
            prog_prefix = None
            try:
                scheduled = course.get("scheduledCourseCode") or {}
                published = course.get("publishedCourseCode") or {}
                matched = course.get("matchedCourseCode") or {}
                prog_prefix = (
                    scheduled.get("prefix")
                    or published.get("prefix")
                    or matched.get("prefix")
                )
            except Exception:
                prog_prefix = None
            school_prefix = program_to_school.get(prog_prefix)
            if not prog_prefix or not school_prefix:
                # cannot resolve destination
                continue
            grouped_list = aggregate_grouped_from_courses([course], preferred_prefix=prog_prefix)
            # GE tags should only include the translated GE letter (A–H)
            ge_tags = [ge_letter]
            dest = courses_by_school.setdefault(school_prefix, {}).setdefault(prog_prefix, [])
            for g in grouped_list:
                merge_group_into_target(dest, g, ge_tags)
    except Exception as e:
        logging.warning(f"Failed to ingest GE {ge_type}/{category_prefix}: {e}")


with open(os.path.join(term_dir, "courses.json"), "w", encoding="utf-8") as f:
    json.dump(courses_by_school, f, ensure_ascii=False, indent=2)

logging.info("Course data generated successfully.")