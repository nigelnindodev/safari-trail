'use client'

import { Gamepad2, LogOut } from "lucide-react";
import ProfileForm from "./profile-form";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/use-profile";

const Profile = () => {
	const { user, isLoading } = useProfile();

	const handleLogout = () => {
		// TODO: implement logout
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!user) return null;

	return (
		<div className="min-h-screen bg-background bg-grid-pattern">
			{/* Header */}
			<header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-50">
				<div className="container mx-auto px-4 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg gradient-gaming flex items-center justify-center glow-purple">
							<Gamepad2 className="w-5 h-5 text-primary-foreground" />
						</div>
						<span className="text-xl font-bold">
							NEXUS<span className="text-secondary">GAMING</span>
						</span>
					</div>

					<Button
						onClick={handleLogout}
						variant="ghost"
						className="text-muted-foreground hover:text-destructive"
					>
						<LogOut className="w-4 h-4 mr-2" />
						Sign Out
					</Button>
				</div>
			</header>

			<ProfileForm user={user} />
		</div>
	);
};

export default Profile;
