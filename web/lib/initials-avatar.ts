export function getInitialsAvatarUrl(name: string, size = 128): string {
  const params = new URLSearchParams({
    seed: name,
    size: String(size),
    backgroundColor: "4f46e5,7c3aed,2563eb,0891b2,0d9488",
    backgroundType: "gradientLinear",
    backgroundRotation: "45",
    textColor: "ffffff",
    fontSize: "45",
  });

  return `https://api.dicebear.com/7.x/initials/svg?${params.toString()}`;
}
