#!/usr/bin/env python3
import csv
import json
import sys
import argparse
from jobspy import scrape_jobs

def main():
    """
    Job search script that can accept arguments via CLI or JSON from stdin.

    Usage:
        # Via command line arguments
        ./jobsearch.py --search-term "software engineer" --location "San Francisco, CA" --results 20

        # Via JSON from stdin
        echo '{"searchTerm": "software engineer", "location": "San Francisco, CA"}' | ./jobsearch.py --json
    """
    parser = argparse.ArgumentParser(description='Search for jobs using JobSpy')

    # Add arguments
    parser.add_argument('--json', action='store_true', help='Read configuration from JSON stdin')
    parser.add_argument('--search-term', type=str, help='Job search term (e.g., "software engineer")')
    parser.add_argument('--location', type=str, help='Job location (e.g., "San Francisco, CA")')
    parser.add_argument('--sites', type=str, nargs='+', default=["indeed", "linkedin", "zip_recruiter", "google"],
                       help='Job sites to search (indeed, linkedin, zip_recruiter, google)')
    parser.add_argument('--results', type=int, default=20, help='Number of results wanted')
    parser.add_argument('--hours-old', type=int, default=72, help='Filter jobs by hours since posted')
    parser.add_argument('--country', type=str, default='USA', help='Country for Indeed searches')
    parser.add_argument('--output', type=str, default='jobs.csv', help='Output CSV file path')
    parser.add_argument('--output-format', type=str, default='csv', choices=['csv', 'json'],
                       help='Output format (csv or json)')
    parser.add_argument('--linkedin-fetch-description', action='store_true',
                       help='Fetch full descriptions from LinkedIn (slower)')
    parser.add_argument('--remote-only', action='store_true', help='Filter for remote jobs only')

    args = parser.parse_args()

    # Configuration defaults
    config = {
        'site_name': ["indeed", "linkedin", "zip_recruiter", "google"],
        'search_term': "software engineer",
        'location': "San Francisco, CA",
        'results_wanted': 20,
        'hours_old': 72,
        'country_indeed': 'USA',
        'output': 'jobs.csv',
        'output_format': 'csv',
        'linkedin_fetch_description': False,
        'is_remote': False
    }

    # Read from JSON stdin if --json flag is set
    if args.json:
        try:
            json_input = sys.stdin.read()
            json_config = json.loads(json_input)

            # Map JSON keys to jobspy parameters
            key_mapping = {
                'searchTerm': 'search_term',
                'location': 'location',
                'sites': 'site_name',
                'results': 'results_wanted',
                'hoursOld': 'hours_old',
                'country': 'country_indeed',
                'output': 'output',
                'outputFormat': 'output_format',
                'linkedinFetchDescription': 'linkedin_fetch_description',
                'remoteOnly': 'is_remote'
            }

            for json_key, config_key in key_mapping.items():
                if json_key in json_config:
                    config[config_key] = json_config[json_key]

        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON input: {str(e)}"}), file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(json.dumps({"error": f"Error reading JSON: {str(e)}"}), file=sys.stderr)
            sys.exit(1)
    else:
        # Use command line arguments
        if args.search_term:
            config['search_term'] = args.search_term
        if args.location:
            config['location'] = args.location
        if args.sites:
            config['site_name'] = args.sites
        if args.results:
            config['results_wanted'] = args.results
        if args.hours_old:
            config['hours_old'] = args.hours_old
        if args.country:
            config['country_indeed'] = args.country
        if args.output:
            config['output'] = args.output
        if args.output_format:
            config['output_format'] = args.output_format
        if args.linkedin_fetch_description:
            config['linkedin_fetch_description'] = True
        if args.remote_only:
            config['is_remote'] = True

    # Build google_search_term from search_term and location
    google_search_term = f"{config['search_term']} jobs near {config['location']}"
    if config['hours_old'] <= 24:
        google_search_term += " since yesterday"
    elif config['hours_old'] <= 168:
        google_search_term += f" in the last {config['hours_old'] // 24} days"

    try:
        # Execute job search
        jobs = scrape_jobs(
            site_name=config['site_name'],
            search_term=config['search_term'],
            google_search_term=google_search_term,
            location=config['location'],
            results_wanted=config['results_wanted'],
            hours_old=config['hours_old'],
            country_indeed=config['country_indeed'],
            linkedin_fetch_description=config['linkedin_fetch_description'],
            is_remote=config['is_remote']
        )

        # Output results
        job_count = len(jobs)

        if config['output_format'] == 'json':
            # Convert DataFrame to JSON
            jobs_json = jobs.to_dict('records')
            result = {
                "success": True,
                "count": job_count,
                "jobs": jobs_json,
                "query": {
                    "searchTerm": config['search_term'],
                    "location": config['location'],
                    "sites": config['site_name']
                }
            }
            print(json.dumps(result, indent=2))
        else:
            # CSV output
            jobs.to_csv(config['output'], quoting=csv.QUOTE_NONNUMERIC, escapechar="\\", index=False)
            # Print summary to stdout
            result = {
                "success": True,
                "count": job_count,
                "output": config['output'],
                "query": {
                    "searchTerm": config['search_term'],
                    "location": config['location'],
                    "sites": config['site_name']
                }
            }
            print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e),
            "query": {
                "searchTerm": config.get('search_term'),
                "location": config.get('location')
            }
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
