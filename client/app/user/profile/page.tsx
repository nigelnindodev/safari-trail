import { hasAuthToken } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import Profile from "./profile";

export default async function ProfilePage() {
	const hasToken = await hasAuthToken();
	if (!hasToken) {
		redirect('/');
	}

	return (
		<div>
			<Profile />
		</div>
	);
}
