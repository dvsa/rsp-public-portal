# RSP Public Portal
Public portal for Roadside Payments Project, aiming to enable drivers and/or their operators to pay penalty fines issued by DVSA.

This is a server-rendered Express and Nunjucks application, exposed through an
API Gateway REST API and a single Lambda proxy.

## GOV.UK Frontend and Nunjucks

The portal uses [`govuk-frontend`](https://github.com/alphagov/govuk-frontend)
for GDS styling and [GOV.UK Design System](https://design-system.service.gov.uk/)
components, with Nunjucks templates rendered on the server by Express.

- Page templates are in `src/server/views`. The shared
  `layouts/base.layout.njk` extends `govuk/template.njk` and includes the portal's
  header, footer and cookie banner.
- Import GOV.UK Nunjucks macros from `govuk/components/<component>/macro.njk`.
  Existing pages use components such as `govukInput`, `govukButton`,
  `govukErrorSummary` and `govukBreadcrumbs`.
- `src/public/scss/index.scss` imports the GOV.UK Frontend Sass. Webpack compiles
  it to `dist/public/all.css` and copies the GOV.UK JavaScript, fonts, images and
  component templates into the build output.

Use the Design System's components, styles and patterns wherever appropriate
rather than duplicating their markup or styling. Follow its accessibility
guidance and retain translated content from `src/server/i18n` when changing views.

### Running the app locally 

To run this project locally, clone the repository and the instructions below:

1. `nvm use`
Selects Node 24 based on the `.nvmrc` file.

2. `npm install` 
Installs all project dependencies

3. `npm run build`
Builds the GOV.UK Frontend styles and browser assets, and the server code.
This creates Babel output in `build/server` and Webpack output in `dist/`,
including public assets, views and translations.

4. `npm run start-server`
Builds and runs `build/server/app.local.js`. The local app adds static serving
from the configured asset path; run the full build first. There is no automatic
reloading.

5. `npm run start-dev-server`
Runs the application in development mode, meaning that source code changes will trigger a rebuild and server reload. 

Startup loads `.env` from the working directory. Do not copy real configuration
or credentials into source control. With `USE_SECRETS_MANAGER=true`, startup uses
`REGION`, `SECRETS_MANAGER_SECRET_NAME` and the AWS SDK's normal credential chain.
Select the intended AWS profile explicitly. If its SSO session expires, run
`aws sso login --profile <your-profile>`, then restart the app (or enter `rs` in
nodemon).

### Testing

To run unit tests, run
`npm run test`
or
`test:watch`
to re-run the tests automatically whenever source code changes

`npm run test:coverage`

`npm run test:integration` is a separate manual, local-only HTTP suite. See
[`integration/README.md`](integration/README.md) for scenarios, safety restrictions
and ignored JSON/HTML reports. Stubbed payment responses do not prove real
payment persistence.

### Distribution

Run the following command to build, bundle and package the required artifacts.
`npm run package`

The resulting archive (`package.zip`) is written to `dist/` directory and ready for deployment.

Before deploying the Node 24 bundle, confirm the Lambda runtime is `nodejs24.x`
in the infrastructure configuration for each target environment and that the
deployed handler matches `app.handler`. The local `serverless.yml` instead
references `handler.handler`. Changing that YAML does not change deployed
infrastructure: the CI code-update workflow only calls `update-function-code`.
Coordinate the runtime change and rollback through the infrastructure owner;
do not deploy Node-24-targeted output to an older runtime.

### Git Hooks

Please set up the following prepush git hook in .git/hooks/pre-push

```
#!/bin/sh
npm run prepush && git log -p | scanrepo
```

#### Security

Please install and run the following securiy programs as part of your testing process:

https://github.com/awslabs/git-secrets

- After installing, do a one-time set up with `git secrets --register-aws`. Run with `git secrets --scan`.

https://github.com/UKHomeOffice/repo-security-scanner

- After installing, run with `git log -p | scanrepo`.

These will be run as part of prepush so please make sure you set up the git hook above so you don't accidentally introduce any new security vulnerabilities.
