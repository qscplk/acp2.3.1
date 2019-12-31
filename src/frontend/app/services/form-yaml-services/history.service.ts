import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class HistoryService {
  // Navigations buffers the last two navigations end events.
  // Where the first navigation indicates as the previous navigation.
  private navigations: NavigationEnd[] = [];
  constructor(private readonly router: Router) {
    this.init();
  }

  /** Initializes the service. Must be called before use. */
  init(): void {
    this.router.events
      .pipe(filter<NavigationEnd>(event => event instanceof NavigationEnd))
      .subscribe(event => {
        this.navigations.push(event);
        // Only holds the last two navigations.
        if (this.navigations.length > 2) {
          this.navigations.shift();
        }
      });
  }

  /**
   * Goes back to previous state or to the provided default if none set.
   */
  back(defaultRoutes?: (string | any)[], params?: any) {
    if (defaultRoutes && this.navigations.length !== 2) {
      this.router.navigate(defaultRoutes, params);
    } else {
      this.router.navigateByUrl(this.navigations[0].urlAfterRedirects, params);
    }
  }
}
