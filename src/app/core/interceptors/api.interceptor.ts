import { HttpInterceptorFn } from '@angular/common/http';

export const API_BASE_URL = 'http://localhost:3000/api';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiReq = req.clone({ url: `${API_BASE_URL}${req.url}` });
  return next(apiReq);
};
