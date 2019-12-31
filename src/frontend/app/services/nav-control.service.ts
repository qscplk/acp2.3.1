import { Injectable } from '@angular/core';
import { NavLoaderService } from '@app/services/nav-loader.service';

@Injectable()
export class NavControlService {
  navConfigAdminAddress = 'custom/navconfig-admin.yaml';
  navConfigUserAddress = 'custom/navconfig-user.yaml';

  constructor(private navLoader: NavLoaderService) {}

  getAdminViewNavConfigs() {
    return this.adminViewDefaultNavConfigs;
  }

  getUserViewNavConfigs() {
    return this.userViewDefaultNavConfigs;
  }

  get adminViewDefaultNavConfigs() {
    return this.navLoader.loadNavConfig(this.navConfigAdminAddress).pipe(
      this.navLoader.parseYaml(),
      this.navLoader.mapToAuiNav(),
    );
  }

  get userViewDefaultNavConfigs() {
    return this.navLoader.loadNavConfig(this.navConfigUserAddress).pipe(
      this.navLoader.parseYaml(),
      this.navLoader.mapToAuiNav(),
    );
  }
}
