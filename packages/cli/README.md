# @internity/cli

Run the verification checks attached to an Internity assignment from the
intern's project folder.

```sh
npm install -g @internity/cli
internity login
internity run <assignment-id>
internity submit <assignment-id> --url https://github.com/you/project
internity verify <assignment-id>
```

`run` executes the checks locally without submitting a result. `verify` runs
the same checks and submits a bounded, structured result to the Internity API;
`submit` is an equivalent Boot.dev-style command name. Pass `--url` to submit
the work link and verification result together for staff review. Always pass
the assignment id from the assignment page so a result cannot be attached to
the wrong assignment when several checks are available.
The CLI only runs checks that an instructor attached to the assignment.
