import json
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

TERM_CODE = "20253"

response = requests.get(f"https://classes.usc.edu/api/Schools/TermCode?termCode={TERM_CODE}")
data = response.json()

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
    json.dump(output, f, ensure_ascii=False)

print("Program data generated successfully, gathering data for courses...")

def process_course(course):
    sections_output = []
    sections = course.get("sections") or []
    for section in sections:
        if section.get("isCancelled"):
            continue

        schedule_entries = section.get("schedule") or []
        first_schedule = schedule_entries[0] if len(schedule_entries) > 0 else {}

        units_value = section.get("units")
        if isinstance(units_value, list):
            units_value = units_value[0] if len(units_value) > 0 else None

        duplicate_credit_value = course.get("duplicateCredit") or ""
        duplicated_credits_list = [s.strip() for s in duplicate_credit_value.split(" and ") if s.strip()] if isinstance(duplicate_credit_value, str) else []

        prerequisite_codes = course.get("prerequisiteCourseCodes") or []
        prerequisites_list = []
        for prerequisite in prerequisite_codes:
            try:
                option = prerequisite.get("courseOptions", [{}])[0]
                code = option.get("courseHyphen")
                if code:
                    prerequisites_list.append(code)
            except Exception:
                continue

        instructors = []
        for instructor in section.get("instructors") or []:
            first_name = instructor.get("firstName") or ""
            last_name = instructor.get("lastName") or ""
            full_name = (first_name + " " + last_name).strip()
            if full_name:
                instructors.append(full_name)

        course_code = None
        published = course.get("publishedCourseCode") or {}
        if isinstance(published, dict):
            course_code = published.get("courseHyphen")

        title_value = section.get("name") or course.get("name") or course.get("fullCourseName") or (course.get("publishedCourseCode") or {}).get("courseSpace")
        description_value = course.get("description")

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
                "time": (first_schedule.get("dayCode") or "").replace("H", "Th")
                        + (" " if first_schedule.get("dayCode") else "")
                        + (first_schedule.get("startTime") or "")
                        + (" - " if first_schedule.get("startTime") and first_schedule.get("endTime") else "")
                        + (first_schedule.get("endTime") or ""),
                "duplicatedCredits": duplicated_credits_list,
                "prerequisites": prerequisites_list,
                "dClearance": section.get("hasDClearance"),
                "type": section.get("rnrMode"),
            },
        })

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
                processed_sections = process_course(course)
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
                print(
                    f"Attempt {attempt_index} failed for {school_code}/{program_code}: {error}. Retrying in {wait_seconds}s..."
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
            print(f"Error fetching courses for {school_prefix}/{program_prefix}: {error}")
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


def aggregate_grouped_from_courses(course_list):
    aggregation = {}
    for course in course_list or []:
        processed = process_course(course)
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
    gesm_courses = aggregate_grouped_from_courses((gesm_payload or {}).get("courses", []))
    if gesm_courses:
        courses_by_school.setdefault("GE", {})["GESM"] = gesm_courses
        print(f"Ingested GESM courses: {len(gesm_courses)}")
except Exception as e:
    print(f"Failed to ingest GESM via GE endpoint: {e}")

# Fallback: try normal program fetch for any school that has GESM
if not gesm_courses:
    owner_school = program_to_school.get("GESM")
    if owner_school:
        try:
            fallback_courses = get_courses(owner_school, "GESM")
            if fallback_courses:
                courses_by_school.setdefault("GE", {})["GESM"] = fallback_courses
                print(f"Fallback ingested GESM via normal program: {len(fallback_courses)}")
        except Exception as e:
            print(f"Fallback GESM via normal program failed: {e}")


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
            grouped_list = aggregate_grouped_from_courses([course])
            # GE tags should only include the translated GE letter (A–H)
            ge_tags = [ge_letter]
            dest = courses_by_school.setdefault(school_prefix, {}).setdefault(prog_prefix, [])
            for g in grouped_list:
                merge_group_into_target(dest, g, ge_tags)
    except Exception as e:
        print(f"Failed to ingest GE {ge_type}/{category_prefix}: {e}")


with open(os.path.join(term_dir, "courses.json"), "w", encoding="utf-8") as f:
    json.dump(courses_by_school, f, ensure_ascii=False)

print("Course data generated successfully.")