import json
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

response = requests.get("https://classes.usc.edu/api/Schools/TermCode?termCode=20253")

data = response.json()

output = {"schools": [], "success": True}

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

with open("../app/assets/data/programs.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

print("Program data generated successfully, gathering data for courses...")

def process_course(course):
    courses = []
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
                # Skip malformed prerequisite entries
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

        courses.append({
            "title": section.get("name") or course.get("name"),
            "description": course.get("description"),
            "courseCode": course_code,
            "sectionCode": section.get("sisSectionId"),
            "instructors": instructors,
            "units": units_value,
            "total": section.get("totalSeats"),
            "registered": section.get("registeredSeats"),
            "location": first_schedule.get("location"),
            "time": (first_schedule.get("dayCode") or "").replace("H", "Th") + (" " if first_schedule.get("dayCode") else "") + (first_schedule.get("startTime") or "") + (" - " if first_schedule.get("startTime") and first_schedule.get("endTime") else "") + (first_schedule.get("endTime") or ""),
            "duplicatedCredits": duplicated_credits_list,
            "prerequisites": prerequisites_list,
            "dClearance": section.get("hasDClearance"),
            "type": section.get("rnrMode"),
        })

    return courses

# {"[SCHOOL-CODE]": {"[PROGRAM-CODE]": [processed courses]}}

def get_courses(school_code, program_code):
    last_error = None
    for attempt_index in range(1, 5):  # initial try + 3 retries
        try:
            response = requests.get(
                f"https://classes.usc.edu/api/Courses/CoursesByTermSchoolProgram?termCode=20253&school={school_code}&program={program_code}",
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()

            courses = []
            for course in data.get("courses", []):
                processed = process_course(course)
                if processed:
                    courses.extend(processed)
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

# Now, lets process the courses for each school and program with 4 concurrent threads. console log any error we ecounter.
# After finished, write the json to ../app/assets/data/courses.json

courses_by_school = {}

def fetch_program_courses(school_prefix, program_prefix):
    try:
        return (school_prefix, program_prefix, get_courses(school_prefix, program_prefix), None)
    except Exception as e:
        return (school_prefix, program_prefix, None, e)

tasks = []
with ThreadPoolExecutor(max_workers=16) as executor:
    for school in output.get("schools", []):
        school_prefix = school.get("prefix")
        if not school_prefix:
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

with open("../app/assets/data/courses.json", "w", encoding="utf-8") as f:
    json.dump(courses_by_school, f, ensure_ascii=False)

print("Course data generated successfully.")