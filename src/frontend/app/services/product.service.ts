import { Product, K8sUtilService, API_GATEWAY } from '@alauda/common-snippet';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { get } from 'lodash-es';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(
    private http: HttpClient,
    private readonly k8sUtil: K8sUtilService,
  ) {}

  getProducts(): Observable<Product[]> {
    return this.http
      .get(`${API_GATEWAY}/apis/portal.alauda.io/v1alpha1/alaudaproducts`)
      .pipe(
        map((res: any) => res.items || []),
        map(items =>
          items.map((item: any) => ({
            name: item.metadata.name,
            displayName: this.k8sUtil.getDisplayName(item),
            url: get(item, 'spec.homepage'),
            hide: get(item, 'spec.hide'),
            index: get(item, 'spec.index'),
          })),
        ),
      );
  }
}
