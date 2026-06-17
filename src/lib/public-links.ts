/** Enlace público del flujo de review ligado a un vendedor: `<base>/r/<negocio>/<vendedor>`. */
export function sellerReviewLink(
  base: string,
  businessSlug: string,
  sellerSlug: string,
): string {
  const root = base.replace(/\/$/, "");
  return `${root}/r/${businessSlug}/${sellerSlug}`;
}
