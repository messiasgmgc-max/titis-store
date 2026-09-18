'use client';

import React, { useState, useEffect } from 'react';
import { Star, CheckCircle, MessageSquarePlus, Sparkles, Send, Loader2 } from 'lucide-react';
import { fetchReviews, submitReview, type ProductReview } from '@/lib/reviews';

interface ProductReviewsSectionProps {
  productId?: string;
  productName?: string;
}

export function ProductReviewsSection({ productId, productName }: ProductReviewsSectionProps) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  
  // Form states
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [size, setSize] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchReviews(productId).then((data) => {
      if (mounted) {
        setReviews(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !comment.trim()) return;

    setSubmitting(true);
    setSubmitError(null);

    const res = await submitReview({
      productId,
      productName,
      customerName: name,
      customerCity: city,
      rating,
      comment,
      sizePurchased: size,
    });

    setSubmitting(false);

    if (res.success) {
      setSubmitSuccess(true);
      const updated = await fetchReviews(productId);
      setReviews(updated);
      setTimeout(() => {
        setFormOpen(false);
        setSubmitSuccess(false);
        setName('');
        setCity('');
        setSize('');
        setComment('');
      }, 2500);
    } else {
      setSubmitError(res.error || 'Não foi possível salvar sua avaliação.');
    }
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <section className="mt-16 border-t border-line pt-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Avaliações Verificadas</span>
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-ivory">
            Opinião de Compradores Reais
          </h2>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-gold">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(Number(avgRating))
                      ? 'fill-gold text-gold'
                      : 'text-line'
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-ivory text-sm">{avgRating} de 5</span>
            <span className="text-mist">({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          className="btn btn-outline btn-sm self-start md:self-auto gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider"
        >
          <MessageSquarePlus className="h-4 w-4 text-gold" />
          <span>{formOpen ? 'Cancelar' : 'Avaliar este Produto'}</span>
        </button>
      </div>

      {/* Formulário de Avaliação */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mb-10 rounded-2xl border border-line-gold/40 bg-surface/80 p-6 space-y-4 animate-in fade-in"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-ivory flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <span>Compartilhe sua experiência</span>
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-mist mb-1.5">Sua Nota:</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= (hoverRating || rating)
                        ? 'fill-gold text-gold'
                        : 'text-line hover:text-gold/50'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-gold">
                {hoverRating || rating} {rating === 1 ? 'estrela' : 'estrelas'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-mist mb-1">Seu Nome:</label>
              <input
                type="text"
                required
                placeholder="Ex: Lucas Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-mist mb-1">Sua Cidade / Estado:</label>
              <input
                type="text"
                placeholder="Ex: Belo Horizonte / MG"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-mist mb-1">Tamanho Comprado (opcional):</label>
              <input
                type="text"
                placeholder="Ex: 42, M, G..."
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full bg-obsidian border border-line rounded-xl px-3.5 py-2 text-xs text-ivory focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-mist mb-1">Seu Comentário:</label>
            <textarea
              required
              rows={3}
              placeholder="Conte o que achou do caimento, tecido, acabamento ou da entrega..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-obsidian border border-line rounded-xl p-3 text-xs text-ivory focus:outline-none focus:border-gold resize-none"
            />
          </div>

          {submitError && (
            <p className="text-xs text-rose-400 font-medium">{submitError}</p>
          )}

          {submitSuccess && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckCircle className="h-4 w-4" />
              <span>Avaliação enviada com sucesso! Obrigado por compartilhar.</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="btn btn-ghost btn-sm text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || submitSuccess}
              className="btn btn-gold btn-sm px-5 gap-1.5 text-xs uppercase tracking-wider"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span>{submitting ? 'Enviando...' : 'Publicar Avaliação'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Lista de Avaliações */}
      {loading ? (
        <div className="py-8 text-center text-xs text-mist animate-pulse">
          Carregando avaliações...
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-8 text-center text-xs text-mist">
          Seja o primeiro a avaliar esta peça!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl border border-line bg-surface/40 p-5 space-y-3 flex flex-col justify-between hover:border-gold/30 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gold">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < rev.rating ? 'fill-gold text-gold' : 'text-line'
                        }`}
                      />
                    ))}
                  </div>
                  {rev.sizePurchased && (
                    <span className="text-[10px] text-mist bg-obsidian px-2 py-0.5 rounded border border-line">
                      Tamanho: <strong className="text-ivory">{rev.sizePurchased}</strong>
                    </span>
                  )}
                </div>

                {rev.title && (
                  <h4 className="text-xs font-bold text-ivory">{rev.title}</h4>
                )}

                <p className="text-xs text-mist leading-relaxed italic">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="border-t border-line/50 pt-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-ivory text-xs">{rev.customerName}</span>
                    {rev.isVerifiedPurchase && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle className="h-2.5 w-2.5" />
                        <span>Compra Verificada</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-smoke mt-0.5">{rev.customerCity}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
