CANONICAL_DISPLAY_FIELDS = ["domain", "driver", "toolCalls", "feynman", "auditRating"]
CANONICAL_TOOL_CALL_FIELDS = ["baselineGeneral", "baselineRepoAccess", "eseklMcp"]
HISTORICAL_DISPLAY_FIELDS = ["purpose", "toolLogsFormat", "statusCaveat"]


def validate_display_metadata(run_entry, canonical):
    rid = run_entry.get("runId", "UNKNOWN_RUN")
    disp = run_entry.get("displayMetadata")
    errors = []

    if not isinstance(disp, dict):
        return [f"{rid}: missing required displayMetadata object"]

    required = CANONICAL_DISPLAY_FIELDS if canonical else HISTORICAL_DISPLAY_FIELDS
    for field in required:
        if not disp.get(field):
            errors.append(f"{rid}: displayMetadata missing '{field}'")

    if canonical:
        tool_calls = disp.get("toolCalls")
        if not isinstance(tool_calls, dict):
            errors.append(f"{rid}: displayMetadata.toolCalls must be an object")
        else:
            for field in CANONICAL_TOOL_CALL_FIELDS:
                if not tool_calls.get(field):
                    errors.append(f"{rid}: displayMetadata.toolCalls missing '{field}'")

    return errors


def require_display_metadata(run_entry, canonical):
    errors = validate_display_metadata(run_entry, canonical)
    if errors:
        raise ValueError("; ".join(errors))
    return run_entry["displayMetadata"]
