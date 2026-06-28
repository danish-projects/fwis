/** True when this nav href should show as active for the current path. */
export function isNavLinkActive(
  pathname: string,
  href: string,
  allHrefs: string[]
): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;

  const moreSpecific = allHrefs.filter(
    (other) => other !== href && other.startsWith(`${href}/`)
  );

  return !moreSpecific.some(
    (other) => pathname === other || pathname.startsWith(`${other}/`)
  );
}
