"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { Messages } from "@/lib/messages";

type ReviewFormProps = {
  productId: string;
  productName: string;
  onSubmitted?: () => void;
};

export function ReviewForm({ productId, onSubmitted }: ReviewFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const MAX_IMAGES = 3;
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const arr = Array.from(files).slice(0, MAX_IMAGES);

    const bad = arr.find((f) => f.size > MAX_SIZE);
    if (bad) {
      setError(`Each image must be smaller than ${MAX_SIZE / (1024 * 1024)} MB`);
      return;
    }

    setImages(arr);
    const urls = arr.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const clearImages = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setImages([]);
    setPreviews([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError("Please select a rating.");
      return;
    }
    if (body.length < 10) {
      setError("Review must be at least 10 characters.");
      return;
    }

    setLoading(true);
    try {
      let res: Response;
      if (images.length > 0) {
        const fd = new FormData();
        fd.append("product_id", productId);
        fd.append("customer_name", name);
        fd.append("customer_email", email);
        fd.append("rating", String(rating));
        if (title) fd.append("title", title);
        fd.append("body", body);
        images.forEach((img) => fd.append("images", img));
        res = await fetch("/api/reviews", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_id: productId,
            customer_name: name,
            customer_email: email,
            rating,
            title: title || undefined,
            body,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? Messages.genericError);
        return;
      }

      setSuccess(true);
      setName("");
      setEmail("");
      setRating(0);
      setTitle("");
      setBody("");
      clearImages();
      onSubmitted?.();
    } catch {
      setError(Messages.somethingWentWrong);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-sm border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-sm font-medium text-green-800">{Messages.reviewSubmitted}</p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-2 text-xs text-green-600 underline hover:text-green-800"
        >
          Submit another review
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="review-name" className="block text-xs font-medium text-[#1C1C1C] mb-1">Name *</label>
          <input
            id="review-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="review-email" className="block text-xs font-medium text-[#1C1C1C] mb-1">Email *</label>
          <input
            id="review-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
            placeholder="your@email.com"
          />
        </div>
      </div>

      {/* Star Rating */}
      <div>
        <label className="block text-xs font-medium text-[#1C1C1C] mb-2">Rating *</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-0.5 focus:outline-none"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoveredRating || rating)
                    ? "fill-[#D4A843] text-[#D4A843]"
                    : "text-[#E5D5C5]"
                }`}
              />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-xs text-[#6B6B6B]">{rating}/5</span>}
        </div>
      </div>

      <div>
        <label htmlFor="review-title" className="block text-xs font-medium text-[#1C1C1C] mb-1">Title (optional)</label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
          placeholder="Summarise your experience"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="block text-xs font-medium text-[#1C1C1C] mb-1">Review *</label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          required
          maxLength={2000}
          className="w-full rounded border border-[#E5D5C5] bg-white px-3 py-2 text-sm text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#95271D]"
          placeholder="Tell others about your experience with this product..."
        />
        <p className="mt-1 text-right text-[10px] text-[#6B6B6B]">{body.length}/2000</p>
      </div>

      {/* Image uploads */}
      <div>
        <label className="block text-xs font-medium text-[#1C1C1C] mb-1">Add images (optional, up to 3)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="text-sm"
        />
        {previews.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {previews.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={p} alt={`preview-${i}`} className="h-20 w-20 rounded object-cover" />
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-[#C41E3A]">{error}</p>}

      <button
        type="submit"
        disabled={loading || rating < 1}
        className="inline-flex items-center gap-2 rounded bg-[#95271D] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#7A1F17] transition-colors disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {loading ? "Submitting..." : "Submit Review"}
      </button>
      <p className="text-[10px] text-[#6B6B6B]">Your review will be visible after approval.</p>
    </form>
  );
}
