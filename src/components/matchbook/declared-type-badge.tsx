import { Badge } from "@/components/ui/badge";
import type { DeclaredType } from "@/lib/matchbook/domain";

/**
 * Whether a supplier file was a full catalogue or a delta, stated plainly.
 *
 * This appears on the face of every run and every report on purpose. Reading a
 * delta as a full catalogue is the most expensive mistake available in this
 * product, so the answer is never more than a glance away.
 */
export function DeclaredTypeBadge({
  declaredType,
}: {
  declaredType: DeclaredType | null;
}) {
  if (!declaredType) return null;

  return declaredType === "full" ? (
    <Badge variant="default" className="font-normal">
      Full catalogue
    </Badge>
  ) : (
    <Badge variant="secondary" className="font-normal">
      Changed items only
    </Badge>
  );
}
