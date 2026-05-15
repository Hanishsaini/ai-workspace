"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceDTO } from "@workspace/shared";
import { initials } from "@/lib/utils";

/**
 * One workspace tile on the dashboard. Linear/Vercel-style: name, member
 * stack, role badge, open arrow. Spring-pop entrance via Framer Motion.
 */
export function WorkspaceCard({
  workspace,
  role,
  index,
}: {
  workspace: WorkspaceDTO;
  role: "OWNER" | "EDITOR" | "VIEWER";
  index: number;
}) {
  const members = workspace.members.slice(0, 4);
  const extra = workspace.members.length - members.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04, ease: "easeOut" }}
    >
      <Link
        href={`/w/${workspace.id}`}
        className="group flex h-full flex-col justify-between gap-6 rounded-xl border bg-card p-5 transition-colors hover:bg-accent/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              {workspace.name}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {workspace.members.length}{" "}
              {workspace.members.length === 1 ? "member" : "members"}
            </p>
          </div>
          <Badge variant={role === "OWNER" ? "default" : "secondary"}>
            {role.toLowerCase()}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center">
            {members.map((m) => (
              <Avatar
                key={m.id}
                className="-ml-2 h-7 w-7 ring-2 ring-card first:ml-0"
                style={{ boxShadow: `0 0 0 1.5px ${m.cursorColor}` }}
              >
                {m.user.avatarUrl && (
                  <AvatarImage src={m.user.avatarUrl} alt={m.user.name ?? ""} />
                )}
                <AvatarFallback className="text-[10px]">
                  {initials(m.user.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {extra > 0 && (
              <div className="-ml-2 flex h-7 items-center rounded-full border bg-muted px-2 text-[10px] font-medium">
                <Users className="mr-1 h-3 w-3" /> +{extra}
              </div>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
