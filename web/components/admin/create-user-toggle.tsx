"use client";

import { useState } from "react";
import { UserPlus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/** Раскрывающийся блок с формой создания пользователя (/admin/users). */
export function CreateUserToggle() {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls="create-user-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <UserPlus size={16} />
        {t("addUser")}
        <ChevronDown size={16} className={cn("transition-transform", open && "rotate-180")} aria-hidden="true" />
      </Button>

      {open && (
        <div id="create-user-panel" className="mt-4">
          <CreateUserForm />
        </div>
      )}
    </div>
  );
}
