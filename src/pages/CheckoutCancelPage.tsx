import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export const CheckoutCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-12 flex flex-col items-center justify-center text-center space-y-6 page-enter min-h-[60vh]">
      <div className="w-full bg-[#141210] border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-stone-800 mx-auto flex items-center justify-center text-stone-400">
          <ShieldAlert className="w-7 h-7 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold font-cinzel text-stone-100">
            Checkout Cancelled
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 leading-relaxed max-w-xs mx-auto">
            No charges were made to your account. You can continue playing in free ad-supported mode anytime.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-850 border border-stone-750 text-stone-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to TimeGuess</span>
        </button>
      </div>
    </div>
  );
};
