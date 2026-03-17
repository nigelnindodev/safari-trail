'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Gamepad2,
	Save,
	Monitor,
	Smartphone,
	User,
	Mail,
	Calendar
} from 'lucide-react';
import { GamingPlatform } from '@/types/platforms';
import { useProfile } from '@/hooks/use-profile';
import { User as UserType } from '@/types/user';
import { toast } from 'sonner';

const PLATFORMS: { id: GamingPlatform; label: string; icon: React.ReactNode }[] = [
	{ id: 'pc', label: 'PC', icon: <Monitor className="w-4 h-4" /> },
	{ id: 'playstation', label: 'PlayStation', icon: <Gamepad2 className="w-4 h-4" /> },
	{ id: 'xbox', label: 'Xbox', icon: <Gamepad2 className="w-4 h-4" /> },
	{ id: 'nintendo', label: 'Nintendo', icon: <Gamepad2 className="w-4 h-4" /> },
	{ id: 'mobile', label: 'Mobile', icon: <Smartphone className="w-4 h-4" /> },
];


const ProfileForm = ({ user }: { user: UserType }) => {
	const { updateProfile, isUpdating } = useProfile();

	const [bio, setBio] = useState(user.profile.bio || '');
	const [avatarUrl, setAvatarUrl] = useState(user.profile.avatarUrl || '');
	const [selectedPlatforms, setSelectedPlatforms] = useState<GamingPlatform[]>(
		user.profile.platforms || []
	);

	const handlePlatformToggle = (platform: GamingPlatform) => {
		setSelectedPlatforms((prev) =>
			prev.includes(platform)
				? prev.filter((p) => p !== platform)
				: [...prev, platform]
		);
	};

	const handleSave = () => {
		updateProfile(
			{ bio, avatarUrl, platforms: selectedPlatforms },
			{
				onSuccess: () => toast.success('Profile updated.'),
				onError: () => toast.error('Error updating profile.'),
			}

		);
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	};

	return (
		<div className="min-h-screen bg-background bg-grid-pattern">
			{/* Main Content */}
			<main className="container mx-auto px-4 py-8 max-w-4xl">
				<div className="grid gap-6 md:grid-cols-3">
					{/* Profile Card */}
					<Card className="md:col-span-1 bg-card/80 backdrop-blur-xl neon-border">
						<CardContent className="pt-6">
							<div className="flex flex-col items-center text-center">
								<Avatar className="w-24 h-24 border-2 border-primary glow-purple">
									<AvatarImage src={user.profile.avatarUrl || ""} alt={user.name} />
									<AvatarFallback className="bg-muted text-2xl">
										{user.name.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>

								<h2 className="mt-4 text-xl font-bold text-glow-purple">{user.name}</h2>

								<div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
									<Mail className="w-4 h-4" />
									{user.email}
								</div>

								<div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
									<Calendar className="w-4 h-4" />
									Joined {formatDate(new Date())}
								</div>

								{selectedPlatforms.length > 0 && (
									<div className="flex flex-wrap gap-2 mt-4 justify-center">
										{selectedPlatforms.map((platform) => (
											<Badge
												key={platform}
												variant="secondary"
												className="bg-primary/20 text-primary border border-primary/30"
											>
												{platform}
											</Badge>
										))}
									</div>
								)}
							</div>
						</CardContent>
					</Card>

					{/* Edit Form */}
					<Card className="md:col-span-2 bg-card/80 backdrop-blur-xl neon-border">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="w-5 h-5 text-primary" />
								Edit Profile
							</CardTitle>
							<CardDescription>
								Customize your gaming profile
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-6">
							{/* Avatar URL */}
							<div className="space-y-2">
								<Label htmlFor="avatar">Avatar URL</Label>
								<Input
									id="avatar"
									type="url"
									placeholder="https://example.com/avatar.png"
									value={avatarUrl}
									onChange={(e) => setAvatarUrl(e.target.value)}
									className="bg-muted/50 border-border focus:border-primary"
								/>
								<p className="text-xs text-muted-foreground">
									Enter a URL for your profile picture
								</p>
							</div>

							{/* Bio */}
							<div className="space-y-2">
								<Label htmlFor="bio">Bio</Label>
								<Textarea
									id="bio"
									placeholder="Tell us about yourself and your gaming journey..."
									value={bio}
									onChange={(e) => setBio(e.target.value)}
									rows={4}
									className="bg-muted/50 border-border focus:border-primary resize-none"
								/>
								<p className="text-xs text-muted-foreground">
									{bio.length}/500 characters
								</p>
							</div>

							{/* Gaming Platforms */}
							<div className="space-y-3">
								<Label>Gaming Platforms</Label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{PLATFORMS.map((platform) => (
										<label
											key={platform.id}
											className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedPlatforms.includes(platform.id)
												? 'border-primary bg-primary/10 glow-purple'
												: 'border-border hover:border-muted-foreground'
												}`}
										>
											<Checkbox
												checked={selectedPlatforms.includes(platform.id)}
												onCheckedChange={() => handlePlatformToggle(platform.id)}
												className="border-primary data-[state=checked]:bg-primary"
											/>
											<span className="flex items-center gap-2">
												{platform.icon}
												{platform.label}
											</span>
										</label>
									))}
								</div>
							</div>

							{/* Save Button */}
							<Button
								onClick={handleSave}
								disabled={isUpdating}
								className="w-full gradient-gaming hover:opacity-90 glow-purple transition-all duration-300"
							>
								{isUpdating ? (
									<div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
								) : (
									<>
										<Save className="w-4 h-4 mr-2" />
										Save Changes
									</>
								)}
							</Button>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
};

export default ProfileForm;
