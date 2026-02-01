"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProfile, useDeleteProfile } from "@/hooks/use-profiles";
import { useProfile } from "@/components/profile-provider";
import { PROFILE_COLORS, PROFILE_AVATARS, AGE_RATINGS } from "@/lib/constants/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ProfilesPage() {
    const router = useRouter();
    const { profiles, isLoading, selectProfile } = useProfile();
    const createProfile = useCreateProfile();
    const deleteProfile = useDeleteProfile();

    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newProfileName, setNewProfileName] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState(PROFILE_AVATARS[0]);
    const [selectedColor, setSelectedColor] = useState(PROFILE_COLORS[0]);
    const [selectedAgeRating, setSelectedAgeRating] = useState<number | null>(null);
    const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

    const handleSelectProfile = (profileId: string) => {
        if (isEditing) return;
        selectProfile(profileId);
    };

    const handleCreateProfile = async () => {
        if (!newProfileName.trim()) {
            toast.error("Please enter a profile name");
            return;
        }

        try {
            await createProfile.mutateAsync({
                name: newProfileName.trim(),
                avatar: selectedAvatar,
                color: selectedColor,
                maxAgeRating: selectedAgeRating,
            });
            setNewProfileName("");
            setSelectedAvatar(PROFILE_AVATARS[0]);
            setSelectedColor(PROFILE_COLORS[0]);
            setSelectedAgeRating(null);
            setIsCreating(false);
            toast.success("Profile created");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to create profile");
        }
    };

    const handleDeleteProfile = async () => {
        if (!profileToDelete) return;
        try {
            await deleteProfile.mutateAsync(profileToDelete);
            setProfileToDelete(null);
            toast.success("Profile deleted");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to delete profile");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const canAddMore = (profiles?.length || 0) < 4;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            {/* Logo */}
            <div className="mb-8">
                <Image
                    src="/logo.svg"
                    alt="StreamUI"
                    width={180}
                    height={40}
                    className="h-8 w-auto dark:invert opacity-90"
                    priority
                />
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-light mb-2">Who&apos;s watching?</h1>
            <p className="text-sm text-muted-foreground mb-8">Select a profile to continue</p>

            {/* Profiles Grid */}
            <div className="flex flex-wrap justify-center gap-6 max-w-3xl mb-8">
                {profiles?.map((profile) => (
                    <button
                        key={profile.id}
                        onClick={() => handleSelectProfile(profile.id)}
                        className="group relative flex flex-col items-center gap-3 p-2 rounded-lg transition-transform hover:scale-105"
                    >
                        {/* Avatar */}
                        <div
                            className={cn(
                                "size-24 md:size-28 rounded-lg flex items-center justify-center text-4xl md:text-5xl transition-all",
                                "ring-2 ring-transparent group-hover:ring-white/50",
                                isEditing && "opacity-70"
                            )}
                            style={{ backgroundColor: profile.color || PROFILE_COLORS[0] }}
                        >
                            {profile.avatar || "👤"}
                        </div>

                        {/* Name */}
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            {profile.name}
                        </span>

                        {/* Age rating indicator */}
                        {profile.maxAgeRating && (
                            <span className="absolute -top-1 -left-1 text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">
                                {profile.maxAgeRating}+
                            </span>
                        )}

                        {/* Trakt indicator */}
                        {profile.traktUsername && (
                            <span className="absolute -top-1 -right-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                Trakt
                            </span>
                        )}

                        {/* Edit/Delete buttons when editing */}
                        {isEditing && (
                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 rounded-lg">
                                <Button
                                    size="icon"
                                    variant="secondary"
                                    className="size-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/profiles/${profile.id}/edit`);
                                    }}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                                {(profiles?.length || 0) > 1 && (
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        className="size-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProfileToDelete(profile.id);
                                        }}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                )}
                            </div>
                        )}
                    </button>
                ))}

                {/* Add Profile Button */}
                {canAddMore && !isEditing && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="group flex flex-col items-center gap-3 p-2"
                    >
                        <div className="size-24 md:size-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center transition-all group-hover:border-primary/50 group-hover:bg-muted/30">
                            <Plus className="size-10 text-muted-foreground/50 group-hover:text-primary/70" />
                        </div>
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            Add Profile
                        </span>
                    </button>
                )}
            </div>

            {/* Manage Profiles Button */}
            {(profiles?.length || 0) > 0 && (
                <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                >
                    {isEditing ? (
                        <>
                            <Check className="size-4" />
                            Done
                        </>
                    ) : (
                        <>
                            <Pencil className="size-4" />
                            Manage Profiles
                        </>
                    )}
                </Button>
            )}

            {/* Create Profile Dialog */}
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Profile</DialogTitle>
                        <DialogDescription>
                            Add a new profile for personalized recommendations and watch history.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        {/* Profile Name */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Name</label>
                            <Input
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                placeholder="Profile name"
                                maxLength={20}
                            />
                        </div>

                        {/* Avatar Selection */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Avatar</label>
                            <div className="flex flex-wrap gap-2">
                                {PROFILE_AVATARS.map((avatar) => (
                                    <button
                                        key={avatar}
                                        onClick={() => setSelectedAvatar(avatar)}
                                        className={cn(
                                            "size-10 rounded-lg flex items-center justify-center text-xl transition-all",
                                            selectedAvatar === avatar
                                                ? "ring-2 ring-primary bg-primary/10"
                                                : "bg-muted hover:bg-muted/80"
                                        )}
                                    >
                                        {avatar}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Selection */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {PROFILE_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={cn(
                                            "size-8 rounded-full transition-all",
                                            selectedColor === color && "ring-2 ring-offset-2 ring-offset-background ring-white"
                                        )}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Age Rating */}
                        <div className="space-y-2">
                            <label className="text-sm text-muted-foreground">Content Rating</label>
                            <Select
                                value={selectedAgeRating?.toString() ?? "none"}
                                onValueChange={(v) => setSelectedAgeRating(v === "none" ? null : parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select age restriction" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AGE_RATINGS.map((rating) => (
                                        <SelectItem key={rating.value ?? "none"} value={rating.value?.toString() ?? "none"}>
                                            <div className="flex flex-col">
                                                <span>{rating.label}</span>
                                                <span className="text-xs text-muted-foreground">{rating.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preview */}
                        <div className="flex justify-center pt-2">
                            <div className="flex flex-col items-center gap-2">
                                <div
                                    className="size-20 rounded-lg flex items-center justify-center text-3xl"
                                    style={{ backgroundColor: selectedColor }}
                                >
                                    {selectedAvatar}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {newProfileName || "Preview"}
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreating(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateProfile}
                                disabled={!newProfileName.trim() || createProfile.isPending}
                                className="flex-1"
                            >
                                {createProfile.isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    "Create"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!profileToDelete} onOpenChange={() => setProfileToDelete(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Profile?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete this profile and all its watch history.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setProfileToDelete(null)}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteProfile}
                            disabled={deleteProfile.isPending}
                            className="flex-1"
                        >
                            {deleteProfile.isPending ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
