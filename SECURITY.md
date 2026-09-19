# Security policy

## Supported versions

Security fixes are made on the default branch and included in the next release of the affected plugin. Only the latest released version of each plugin is supported. Compatibility is bounded by each plugin's `paseo-plugin.json` requirements.

## Private reporting

Report suspected vulnerabilities through the [private GitHub Security Advisory form](https://github.com/koinzhang/paseo-plugins/security/advisories/new). Do not open a public issue for a vulnerability.

Include the affected plugin and version or commit, impact, a minimal reproduction, and any proposed mitigation. Remove credentials, private paths, repository names, prompts, and transcript contents. If the evidence itself is sensitive, describe it first and wait for a private exchange path.

Paseo plugins are trusted, unsandboxed code: the server entry runs with the daemon user's filesystem, process, credential, and network access. A dependency or release-pipeline compromise is therefore in scope.

The maintainer will acknowledge and triage reports on a best-effort basis and request public disclosure only after a fix or documented mitigation is available.
