import { getAvatarColorStyle } from "@/lib/avatar-colors";
import { getContactAvatarInitial } from "@/components/contacts/contact-avatar-utils";

/**
 * Generates an SVG avatar with the contact's initial and consistent background color,
 * returned as a clean image/svg+xml Response (status 200) instead of a 404 error.
 */
export function getDefaultAvatarSvgResponse(nameOrEmail: string, address: string): Response {
	const initial = getContactAvatarInitial(nameOrEmail, address) || "?";
	const { backgroundColor, color } = getAvatarColorStyle(address || nameOrEmail);

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="48" fill="${backgroundColor}"/>
  <text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="600" fill="${color}" dominant-baseline="middle" text-anchor="middle">${initial}</text>
</svg>`;

	return new Response(svg, {
		status: 200,
		headers: {
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
		},
	});
}
