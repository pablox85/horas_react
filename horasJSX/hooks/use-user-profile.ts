"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

const PROFILE_EVENT = "control-horas-profile-updated";
const PROFILE_KEY_PREFIX = "control_horas_user_profile";

interface UserProfile {
  displayName: string;
  companyName: string;
  companyRut: string;
}

const emptyProfile: UserProfile = {
  displayName: "",
  companyName: "",
  companyRut: "",
};

function profileKey(uid: string): string {
  return `${PROFILE_KEY_PREFIX}:${uid}`;
}

function readProfile(uid: string | undefined): UserProfile {
  if (!uid) return emptyProfile;

  try {
    const raw = localStorage.getItem(profileKey(uid));
    return raw ? { ...emptyProfile, ...(JSON.parse(raw) as Partial<UserProfile>) } : emptyProfile;
  } catch (error) {
    console.error("No se pudo leer el perfil local:", error);
    return emptyProfile;
  }
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);

  useEffect(() => {
    setProfile(readProfile(user?.uid));

    function handleProfileUpdated() {
      setProfile(readProfile(user?.uid));
    }

    window.addEventListener(PROFILE_EVENT, handleProfileUpdated);
    return () => window.removeEventListener(PROFILE_EVENT, handleProfileUpdated);
  }, [user?.uid]);

  const displayName = useMemo(() => {
    return profile.displayName.trim() || user?.displayName || user?.email || "Usuario";
  }, [profile.displayName, user?.displayName, user?.email]);

  function saveProfile(nextProfile: UserProfile) {
    if (!user?.uid) return;

    const normalizedProfile = {
      displayName: nextProfile.displayName.trim(),
      companyName: nextProfile.companyName.trim(),
      companyRut: nextProfile.companyRut.trim(),
    };

    localStorage.setItem(profileKey(user.uid), JSON.stringify(normalizedProfile));
    setProfile(normalizedProfile);
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }

  function saveDisplayName(nextDisplayName: string) {
    saveProfile({ ...profile, displayName: nextDisplayName });
  }

  return {
    displayName,
    pdfIssuer: {
      companyName: profile.companyName,
      companyRut: profile.companyRut,
    },
    profile,
    profileDisplayName: profile.displayName,
    saveDisplayName,
    saveProfile,
  };
}
