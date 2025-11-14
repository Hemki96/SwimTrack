const listeners = [];
let currentRoute = "dashboard";

export function onRouteChange(callback) {
  listeners.push(callback);
}

export function navigate(route) {
  if (route === currentRoute) return;
  currentRoute = route;
  listeners.forEach((cb) => cb(route));
}

export function activeRoute() {
  return currentRoute;
}
