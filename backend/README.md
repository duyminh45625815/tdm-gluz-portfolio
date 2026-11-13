<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Seed initial projects

Run `npm run seed:projects` from the backend directory to insert the two initial
academic project records. This is an explicit command; it is not run during
application startup. The seed uses each project's unique slug and only inserts
missing records, so rerunning it does not overwrite existing project content.

## CMS schema rules

Localized content is stored under separate `draft` and `published` objects, with
locale keys `vi`, `en`, `ja`, and `ko`. Use `createDraftLocaleUpdate(locale,
content)` when saving a single locale. To publish, use
`createPublishLocaleUpdate(locale)` and combine its filter with the document
identifier when running the returned update pipeline with its
`updatePipeline: true` option. The pipeline copies only that locale from draft
to published; it does not publish automatically or replace other locales.
Draft writes should enable Mongoose update validators.

Public page reads should require `published.<locale>`. Public project and
education lists should require their matching `presentations.home` or
`presentations.about` flag and `published.<locale>`. Skill groups should also
require the matching `published.<locale>.home` or `.about` content. Sort
presented records by `displayOrder` ascending, then `_id` ascending for a
deterministic order. Presentation flags default to hidden; saving a draft does
not make it public.

Education date-range and page-section compatibility rules run during document
validation. Services should validate and save documents, or explicitly enforce
the same rules before update operations that bypass document validation.

`adminUsers.passwordHash` is excluded from normal selection and stripped by
Mongoose document serialization. Its schema accepts only Argon2id hash
encodings. Passwords must be hashed in the service layer before persistence.
Public APIs must return an explicit safe DTO and must never return the raw
admin document or a lean result containing `passwordHash`.

## Admin authentication

Authentication requires the `JWT_SECRET` environment variable. Configure it
outside source control with at least 32 characters; the application fails to
start if it is missing or too short. Access tokens use HS256 and expire after
15 minutes.

Run `npm run admin:create` from the backend directory in an interactive
terminal to provision an admin account. The script asks for an email and
password interactively, hides password input, confirms it, hashes it with
Argon2id and refuses an existing email. It is not run at application startup
and accepts no credentials as command-line arguments. Password hashing stays
in the service layer; only the hash is persisted.

Login and `/auth/me` return a safe admin DTO. Keep that DTO boundary in future
public endpoints; do not return admin documents or use raw lean admin results.

## HTTP security configuration

The API validates `MONGODB_URI`, `JWT_SECRET`, `PORT`, `LOGIN_RATE_LIMIT_MAX`,
`LOGIN_RATE_LIMIT_TTL_MS`, and `CORS_ALLOWED_ORIGINS` at startup. The login
limit defaults to 5 requests per client IP in 60 seconds. Configure the
comma-separated `CORS_ALLOWED_ORIGINS` with exact HTTP(S) origins in production;
production startup fails if it is missing. Development and tests default to
`http://localhost:3000` and `http://127.0.0.1:3000`.

Login throttling uses Nest's in-memory store, so its counts are per application
instance and reset on restart. A multi-instance deployment needs a shared
throttler store before relying on a global limit. The Express proxy trust
setting remains disabled by default, so untrusted `X-Forwarded-For` headers
are not used to identify clients. If deployed behind a reverse proxy, configure
Express to trust only the known proxy IPs or CIDRs after ensuring that proxy
overwrites forwarded headers; do not trust arbitrary clients or a blind hop
count.

The application enables Nest's built-in security headers and a global
validation pipe. Internal server errors return a generic response and log no
exception details that could contain credentials or connection strings.

## Site Settings Admin API

Authenticated administrators can manage the singleton settings at
`/api/admin/site-settings`: `GET` retrieves it, `POST` creates it once, and
`PATCH` updates provided fields. Updates target individual localized values so
other locales remain intact. The existing Site Settings schema has no
`draft`/`published` fields, so settings updates apply directly; no delete or
publish endpoint is provided.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
