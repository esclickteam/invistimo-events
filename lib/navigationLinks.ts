export function getGoogleMapsLink(location: {
  lat?: number | null;
  lng?: number | null;
  address?: string;
}) {
  if (location.lat && location.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
  }

  if (location.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location.address
    )}`;
  }

  return null;
}

export function getWazeLink(location: {
  lat?: number | null;
  lng?: number | null;
  address?: string;
}) {
  if (location.lat && location.lng) {
    return `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
  }

  if (location.address) {
    return `https://waze.com/ul?q=${encodeURIComponent(
      location.address
    )}&navigate=yes`;
  }

  return null;
}
