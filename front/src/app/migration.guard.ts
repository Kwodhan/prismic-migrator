import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const migrationGuard: CanActivateFn = () => {
  const router = inject(Router);

  const source = localStorage.getItem('migration_source_env');
  const target = localStorage.getItem('migration_target_env');

  if (!source || !target) {
    return router.createUrlTree(['/']);
  }

  return true;
};
