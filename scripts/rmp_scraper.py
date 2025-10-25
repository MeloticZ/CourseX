#!/usr/bin/env python3
"""
RateMyProfessors Scraper
Scrapes all professor ratings from USC (School ID: U2Nob29sLTEzODE=) and exports to JSON.
Handles duplicate professor names by averaging their scores.
Includes legacyId as 'id' field for non-duplicated professors.
"""

import requests
import json
import time
from typing import Dict, List, Any
from collections import defaultdict

# Constants
GRAPHQL_URL = "https://www.ratemyprofessors.com/graphql"
SCHOOL_ID = "U2Nob29sLTEzODE="  # USC
BATCH_SIZE = 1000  # Maximum allowed per request
OUTPUT_FILE = "rmp_professors.json"

# GraphQL Query
GRAPHQL_QUERY = """query TeacherSearchResultsPageQuery(
  $query: TeacherSearchQuery!
  $schoolID: ID
  $includeSchoolFilter: Boolean!
) {
  search: newSearch {
    ...TeacherSearchPagination_search_2MvZSr
  }
  school: node(id: $schoolID) @include(if: $includeSchoolFilter) {
    __typename
    ... on School {
      name
      ...StickyHeaderContent_school
    }
    id
  }
}

fragment CardFeedback_teacher on Teacher {
  wouldTakeAgainPercent
  avgDifficulty
}

fragment CardName_teacher on Teacher {
  firstName
  lastName
}

fragment CardSchool_teacher on Teacher {
  department
  school {
    name
    id
  }
}

fragment CompareSchoolLink_school on School {
  legacyId
}

fragment HeaderDescription_school on School {
  name
  city
  state
  legacyId
  ...RateSchoolLink_school
  ...CompareSchoolLink_school
}

fragment HeaderRateButton_school on School {
  ...RateSchoolLink_school
  ...CompareSchoolLink_school
}

fragment RateSchoolLink_school on School {
  legacyId
}

fragment StickyHeaderContent_school on School {
  name
  ...HeaderDescription_school
  ...HeaderRateButton_school
}

fragment TeacherBookmark_teacher on Teacher {
  id
  isSaved
}

fragment TeacherCard_teacher on Teacher {
  id
  legacyId
  avgRating
  numRatings
  ...CardFeedback_teacher
  ...CardSchool_teacher
  ...CardName_teacher
  ...TeacherBookmark_teacher
}

fragment TeacherSearchPagination_search_2MvZSr on newSearch {
  teachers(query: $query, first: 1000, after: "") {
    didFallback
    edges {
      cursor
      node {
        ...TeacherCard_teacher
        id
        __typename
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    resultCount
    filters {
      field
      options {
        value
        id
      }
    }
  }
}
"""


def make_request(cursor: str = "") -> Dict[str, Any]:
    """Make a GraphQL request to RateMyProfessors API."""
    
    # Update the query to use the cursor for pagination
    query = GRAPHQL_QUERY.replace('first: 1000, after: ""', f'first: {BATCH_SIZE}, after: "{cursor}"')
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.ratemyprofessors.com/search/professors/1381?q=*',
        'Origin': 'https://www.ratemyprofessors.com',
        'Content-Type': 'application/json',
        'Authorization': 'null',
    }
    
    payload = {
        "query": query,
        "variables": {
            "query": {
                "text": "",
                "schoolID": SCHOOL_ID,
                "fallback": True
            },
            "schoolID": SCHOOL_ID,
            "includeSchoolFilter": True
        }
    }
    
    response = requests.post(GRAPHQL_URL, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()


def scrape_all_professors() -> Dict[str, List[Dict[str, Any]]]:
    """Scrape all professors from RateMyProfessors, collecting all entries including duplicates."""
    
    # Use defaultdict to collect all professors with the same name
    professors = defaultdict(list)
    cursor = ""
    page = 1
    total_count = None
    total_processed = 0
    
    while True:
        print(f"Fetching page {page} (cursor: {cursor[:20] if cursor else 'initial'})...")
        
        try:
            data = make_request(cursor)
        except Exception as e:
            print(f"Error on page {page}: {e}")
            time.sleep(5)
            continue
        
        # Extract teacher data
        teachers_data = data.get("data", {}).get("search", {}).get("teachers", {})
        edges = teachers_data.get("edges", [])
        page_info = teachers_data.get("pageInfo", {})
        
        if total_count is None:
            total_count = teachers_data.get("resultCount", 0)
            print(f"Total professors to fetch: {total_count}")
        
        # Process each professor
        for edge in edges:
            node = edge.get("node", {})
            
            first_name = node.get("firstName", "")
            last_name = node.get("lastName", "")
            full_name = f"{first_name} {last_name}".strip()
            
            # Collect all professors with this name, including legacyId
            professors[full_name].append({
                "id": node.get("legacyId"),
                "difficulty": node.get("avgDifficulty"),
                "rating": node.get("avgRating"),
                "rating_count": node.get("numRatings"),
                "take_again": node.get("wouldTakeAgainPercent")
            })
            total_processed += 1
        
        print(f"Processed {len(edges)} professors. Total so far: {total_processed}")
        
        # Check if there are more pages
        has_next_page = page_info.get("hasNextPage", False)
        if not has_next_page:
            print("No more pages. Scraping complete!")
            break
        
        # Get cursor for next page
        cursor = page_info.get("endCursor", "")
        if not cursor:
            print("No cursor found. Stopping.")
            break
        
        page += 1
        
        # Be nice to the server
        time.sleep(1)
    
    return professors


def average_professors(professors: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Dict[str, Any]]:
    """Average the scores for professors with duplicate names and add 'duplicated' flag."""
    
    result = {}
    duplicates_found = 0
    
    for name, entries in professors.items():
        if len(entries) > 1:
            duplicates_found += 1
            print(f"Found duplicate: {name} ({len(entries)} entries)")
            
            # Calculate averages, handling None values
            total_difficulty = []
            total_rating = []
            total_rating_count = []
            total_take_again = []
            
            for entry in entries:
                if entry["difficulty"] is not None:
                    total_difficulty.append(entry["difficulty"])
                if entry["rating"] is not None:
                    total_rating.append(entry["rating"])
                if entry["rating_count"] is not None:
                    total_rating_count.append(entry["rating_count"])
                if entry["take_again"] is not None:
                    total_take_again.append(entry["take_again"])
            
            # For duplicates, do NOT include the id field
            result[name] = {
                "difficulty": round(sum(total_difficulty) / len(total_difficulty), 2) if total_difficulty else None,
                "rating": round(sum(total_rating) / len(total_rating), 2) if total_rating else None,
                "rating_count": int(sum(total_rating_count) / len(total_rating_count)) if total_rating_count else None,
                "take_again": round(sum(total_take_again) / len(total_take_again), 2) if total_take_again else None,
                "duplicated": True
            }
        else:
            # Single entry, no duplication - include the id field
            entry = entries[0]
            result[name] = {
                "id": entry["id"],
                "difficulty": entry["difficulty"],
                "rating": entry["rating"],
                "rating_count": entry["rating_count"],
                "take_again": entry["take_again"]
            }
    
    print(f"\nTotal duplicates found: {duplicates_found}")
    return result


def main():
    """Main function to run the scraper."""
    print("Starting RateMyProfessors scraper...")
    print(f"School ID: {SCHOOL_ID}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Output file: {OUTPUT_FILE}")
    print("-" * 50)
    
    # Scrape all professors (including duplicates)
    professors_raw = scrape_all_professors()
    
    # Average duplicates and add flags
    print("\nProcessing duplicates...")
    professors = average_professors(professors_raw)
    
    # Save to JSON file
    print(f"\nSaving {len(professors)} unique professors to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(professors, f, indent=2, ensure_ascii=False)
    
    print(f"Done! Saved to {OUTPUT_FILE}")
    
    # Print sample with duplicates
    print("\nSample entries (including duplicates if any):")
    duplicate_samples = [(name, data) for name, data in professors.items() if data.get("duplicated")]
    regular_samples = [(name, data) for name, data in professors.items() if not data.get("duplicated")]
    
    if duplicate_samples:
        print("\nDuplicate examples (no id field):")
        for i, (name, data) in enumerate(duplicate_samples[:3]):
            print(f"  {name}: {data}")
            if i >= 2:
                break
    
    print("\nRegular examples (with id field):")
    for i, (name, data) in enumerate(regular_samples[:3]):
        print(f"  {name}: {data}")
        if i >= 2:
            break


if __name__ == "__main__":
    main()

