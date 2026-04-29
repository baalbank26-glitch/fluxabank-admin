// Main API export - maintains backward compatibility
import { authService } from './auth.service';
import { usersService } from './users.service';
import { walletService } from './wallet.service';
import { treasuryService } from './treasury.service';
import { settingsService } from './settings.service';
import { providersService } from './providers.service';
import { medService } from './med.service';
import { meService } from './me.service';
import { webhooksService } from './webhooks.service';
import { securityService } from './security.service';
import { documentsService } from './documents.service';
import { adminsService } from './admins.service';

type ApiType = {
  auth: typeof authService;
  admin: {
    users: typeof usersService;
    wallet: typeof walletService;
    treasury: typeof treasuryService;
    settings: typeof settingsService;
    providers: typeof providersService;
    security: typeof securityService;
    documents: typeof documentsService;
    admins: typeof adminsService;
  };
  med: typeof medService;
  me: typeof meService;
  webhooks: typeof webhooksService;
};

export const api: ApiType = {
  auth: authService,
  admin: {
    users: usersService,
    wallet: walletService,
    treasury: treasuryService,
    settings: settingsService,
    providers: providersService,
    security: securityService,
    documents: documentsService,
    admins: adminsService,
  },
  med: medService,
  me: meService,
  webhooks: webhooksService,
};

// Export individual services for direct imports if needed
export { authService } from './auth.service';
export { usersService } from './users.service';
export { walletService } from './wallet.service';
export { treasuryService } from './treasury.service';
export { settingsService } from './settings.service';
export { providersService } from './providers.service';
export { medService } from './med.service';
export { meService } from './me.service';
export { webhooksService } from './webhooks.service';
export { documentsService } from './documents.service';
export { adminsService } from './admins.service';
