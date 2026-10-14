import { useState } from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Image,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  DetailList,
  Drawer,
  StatusBadge,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { reviewsDb } from "./data";
import { Stars } from "./Stars";
import { typeLabel, type Review } from "./types";

export default function ReviewDrawer({
  review,
  onClose,
}: {
  review: Review | undefined;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={!!review}
      onClose={onClose}
      title={review ? `Review ${review.ref}` : ""}
      subtitle={
        review
          ? `${typeLabel(review.targetType)} · ${review.targetName}`
          : undefined
      }
    >
      {review && (
        <ReviewBody key={review.id} review={review} onClose={onClose} />
      )}
    </Drawer>
  );
}

function ReviewBody({
  review,
  onClose,
}: {
  review: Review;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canManage = can("reviews.manage");
  const [reply, setReply] = useState(review.adminReply?.text ?? "");

  // The backend writes the audit row for every moderation change.
  const act = async (patch: Partial<Review>, message: string) => {
    try {
      await reviewsDb.update(review.id, patch);
      toast(message);
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const hide = async () => {
    const reason = await confirm({
      title: "Hide review?",
      message:
        "The review will no longer be visible in the apps or on the website.",
      confirmLabel: "Hide review",
      tone: "danger",
      withReason: true,
      reasonLabel: "Reason for hiding",
    });
    if (reason === false) return;
    await act({ status: "hidden", hiddenReason: reason }, "Review hidden");
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Delete review permanently?",
      message:
        "This cannot be undone. The partner rating will be recalculated.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok === false) return;
    try {
      await reviewsDb.remove(review.id);
      toast("Review deleted", "info");
      onClose();
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  };

  const saveReply = () =>
    act(
      {
        adminReply: reply.trim()
          ? { text: reply.trim(), at: new Date().toISOString() }
          : undefined,
      },
      reply.trim() ? "Reply posted as VedRashi" : "Reply removed",
    );

  return (
    <div className="space-y-6">
      {review.status === "flagged" && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800">
              Reported: {review.reportedReason}
            </p>
            <p className="text-amber-700">Flagged by {review.reportedBy}</p>
          </div>
        </div>
      )}
      {review.status === "hidden" && review.hiddenReason && (
        <div className="rounded-xl border border-line bg-gray-50 p-4 text-sm text-muted">
          Hidden: {review.hiddenReason}
        </div>
      )}

      <div>
        <div className="flex items-center gap-3">
          <Stars value={review.rating} size={18} />
          <span className="font-semibold">{review.rating}.0</span>
          <StatusBadge status={review.status} />
        </div>
        <p className="mt-3 text-sm leading-relaxed">{review.text}</p>
        {review.photos > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
            <Image className="size-3.5" /> {review.photos} photo
            {review.photos > 1 ? "s" : ""} attached
          </p>
        )}
      </div>

      {review.subRatings && (
        <div className="grid grid-cols-3 gap-3">
          {(["punctuality", "knowledge", "professionalism"] as const).map(
            (k) => (
              <div
                key={k}
                className="rounded-xl border border-line p-3 text-center"
              >
                <p className="text-xs text-muted capitalize">{k}</p>
                <p className="mt-1 text-lg font-semibold">
                  {review.subRatings![k]}/5
                </p>
              </div>
            ),
          )}
        </div>
      )}

      <DetailList
        items={[
          { label: "Customer", value: review.customerName },
          { label: "Target", value: review.targetName },
          {
            label: "Type",
            value: <Badge tone="purple">{typeLabel(review.targetType)}</Badge>,
          },
          {
            label: review.targetType === "pandit" ? "Puja" : "Context",
            value: review.context ?? "—",
          },
          { label: "Posted", value: formatDateTime(review.createdAt) },
        ]}
      />

      {review.partnerReply && (
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs text-muted">
            Reply by partner
            {review.partnerReply.at
              ? ` · ${formatDateTime(review.partnerReply.at)}`
              : ""}
          </p>
          <p className="mt-1 text-sm">{review.partnerReply.text}</p>
        </div>
      )}

      {canManage && (
        <>
          <div className="space-y-2">
            <Textarea
              label="Reply as VedRashi"
              hint={
                review.adminReply
                  ? `Posted ${formatDateTime(review.adminReply.at)}`
                  : undefined
              }
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="Thank you for your feedback…"
            />
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                disabled={reply.trim() === (review.adminReply?.text ?? "")}
                onClick={saveReply}
              >
                {review.adminReply ? "Update reply" : "Post reply"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-5">
            {review.status === "flagged" && (
              <Button
                variant="success"
                size="sm"
                icon={<ShieldCheck className="size-3.5" />}
                onClick={() =>
                  act(
                    {
                      status: "published",
                      reportedReason: undefined,
                      reportedBy: undefined,
                    },
                    "Flag dismissed — review stays published",
                  )
                }
              >
                Dismiss flag
              </Button>
            )}
            {review.status === "hidden" ? (
              <Button
                size="sm"
                icon={<Eye className="size-3.5" />}
                onClick={() =>
                  act(
                    { status: "published", hiddenReason: undefined },
                    "Review published",
                  )
                }
              >
                Publish
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                icon={<EyeOff className="size-3.5" />}
                onClick={hide}
              >
                Hide
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="size-3.5" />}
              onClick={remove}
              className="ml-auto"
            >
              Delete
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
