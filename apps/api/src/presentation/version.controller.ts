import { Controller, Get } from '@nestjs/common';

/** Release name of this build. Bump it with each tagged release. */
export const APP_VERSION = '0.4.0-sprint2';

/**
 * Public: which release is running (Lab 5 R-08).
 * `commit` is the full commit SHA the image was built from; deploy/release.sh sets GIT_SHA
 * on every Cloud Run revision. Local runs have no GIT_SHA and report "local".
 */
@Controller('version')
export class VersionController {
  @Get()
  get() {
    const commit = process.env.GIT_SHA?.trim() || 'local';
    return { version: APP_VERSION, commit };
  }
}
