import { geolocation } from "@vercel/functions";

export interface LocationInfo {
  latitude?: string;
  longitude?: string;
  city?: string;
  country?: string;
}

export function getRequestPromptFromHints(requestHints: LocationInfo) {
  return `About the origin of user's request:
- lat: ${requestHints.latitude || "unknown"}
- lon: ${requestHints.longitude || "unknown"}
- city: ${requestHints.city || "unknown"}
- country: ${requestHints.country || "unknown"}
`;
}

export async function getUserLocation(request: Request): Promise<LocationInfo> {
  // Mock location data for development
  if (process.env.NODE_ENV === "development") {
    // Create a new request with mock headers for development
    const mockRequest = new Request(request.url, {
      method: request.method,
      headers: new Headers(request.headers),
    });

    // Set mock location headers for development
    mockRequest.headers.set("x-vercel-ip-country", "DK");
    mockRequest.headers.set("x-vercel-ip-country-region", "DK");
    mockRequest.headers.set("x-vercel-ip-city", "Copenhagen");
    mockRequest.headers.set("x-vercel-ip-latitude", "55.6761");
    mockRequest.headers.set("x-vercel-ip-longitude", "12.5683");

    const { longitude, latitude, city, country } = geolocation(mockRequest);
    return { longitude, latitude, city, country };
  }

  // Use real geolocation in production
  const { longitude, latitude, city, country } = geolocation(request);
  return { longitude, latitude, city, country };
}
