import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";

export const ManifestoSection = () => {
  const navigate = useNavigate();
  const { user } = useUnifiedAuth();

  const handleGetRektClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleReferralClick = () => {
    if (user) {
      navigate('/dashboard?section=social');
    } else {
      navigate('/auth');
    }
  };

  const manifestoItems = [
    {
      icon: "🍩",
      title: "THICC HIPPO ENERGY",
      description: "Weights vary. Morals do not. (No known use case, but vibes are high.)"
    },
    {
      icon: "💩",
      title: "FULL DEGEN MODE", 
      description: "We built a toiletverse and we call it Tropical Fatty's. You entered willingly."
    },
    {
      icon: "🎮",
      title: "GAMES NO ONE ASKED FOR",
      description: "Play Flappy Hippos, Falling Logs, and POOPEE Crush. Earn credits. Cry in silence."
    },
    {
      icon: "🛠",
      title: "STAKING, SORTA",
      description: "Stake NFTs. Stake tokens. Wonder why you did."
    },
    {
      icon: "🪙",
      title: "USDC IN, USDC OUT",
      description: "Buy credits with USDC on 4 chains. Regret available instantly."
    },
    {
      icon: "🌪",
      title: "CHAOTIC NONSENSE",
      description: "We work on vibes and peer pressure. Multichain? Sure. Roadmap? Nah."
    }
  ];

  return (
    <section className="py-20 px-4 bg-gray-900">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl font-bold text-white mb-4 text-center">
          Ready to Go Full Degen?
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="mb-4">
              <img 
                src="/lovable-uploads/81417325-ea93-4f15-9978-969b624b81b8.png" 
                alt="Punk hippo with leather jacket and mohawk" 
                className="w-20 h-20 mx-auto rounded-lg"
              />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Create Account, Play games</h3>
            <p className="text-gray-300 mb-6">
              Sign up to play Flappy Hippos, Falling Logs, and POOPEE Crush. Earn rewards in USDC. Stake tokens. Track the nonsense.
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold"
              onClick={handleGetRektClick}
            >
              Get Rekt
            </Button>
          </div>

          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <div className="mb-4">
              <img 
                src="/lovable-uploads/f185c4a7-1dd0-4d96-bde4-03d4fd96f189.png" 
                alt="Rastafarian hippo with dreads holding microphone" 
                className="w-20 h-20 mx-auto rounded-lg"
              />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">Refer & Corrupt Friends</h3>
            <p className="text-gray-300 mb-6">
              Get your unique referral link after signing in. Send it to someone you barely like. Earn credits when they mint, play, or stake.
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold"
              onClick={handleReferralClick}
            >
              Grab Your Referral Link
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {manifestoItems.map((item, index) => (
            <div key={index} className="bg-gray-800 rounded-xl p-6 flex items-center space-x-4 hover:bg-gray-700 transition-all duration-300 border border-gray-700">
              <div className="text-4xl">{item.icon}</div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="text-gray-300">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
