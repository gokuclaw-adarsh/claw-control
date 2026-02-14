import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Calendar, Users, Plane, Sun, CloudSnow, AlertTriangle, 
  ChevronDown, ChevronUp, Check, X, Sparkles, Clock, IndianRupee,
  Train, Car, Ship, ArrowLeft, Star, Info, Sunrise, Sunset
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';

type PriceTier = 'budget' | 'mid' | 'premium';
type TimeOfDay = 'morning' | 'afternoon' | 'evening';

interface Activity {
  time: TimeOfDay;
  title: string;
  description: string;
  duration: string;
  cost: { budget: number; mid: number; premium: number };
  mustDo?: boolean;
  canSkip?: boolean;
  transport?: string;
  tip?: string;
}

interface DayItinerary {
  day: number;
  title: string;
  activities: Activity[];
}

interface Destination {
  id: string;
  name: string;
  country: string;
  heroImage: string;
  recommendation: 'recommended' | 'rushed' | 'unavailable';
  recommendationText: string;
  weather: { temp: string; condition: string; icon: 'sun' | 'cloud-snow' | 'alert' };
  priceRange: { budget: number; mid: number; premium: number };
  flightCost: number;
  stayCost: string;
  duration: string;
  highlights: string[];
  itinerary: DayItinerary[];
  notes?: string[];
  seasonInfo?: string;
}

const destinations: Destination[] = [
  {
    id: 'varkala',
    name: 'Varkala',
    country: 'Kerala, India',
    heroImage: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80',
    recommendation: 'recommended',
    recommendationText: 'Perfect for 5 days',
    weather: { temp: '28-32°C', condition: 'Sunny & Warm', icon: 'sun' },
    priceRange: { budget: 25000, mid: 32000, premium: 45000 },
    flightCost: 10000,
    stayCost: '₹4-7K/night',
    duration: '5 Days',
    highlights: ['Cliff-top cafes', 'Mangrove Kayaking', 'Surf Schools', 'Papanasam Beach'],
    notes: [
      'Resorts: Elixir Cliff (Premium), B\'Canti (Mid), Nebo Hotel (Modern)',
      'Best Cafes: Abba German Bakery (Breakfast), Rock n Roll (Sunset)',
      'Hidden Gem: Kayaking at Kappil Lake (Copa Cabana)'
    ],
    itinerary: [
      {
        day: 1,
        title: 'Arrival & Cliff Vibes',
        activities: [
          {
            time: 'morning',
            title: 'Fly to Trivandrum',
            description: 'Delhi/Mumbai → Trivandrum (TRV).',
            duration: '3 hrs',
            cost: { budget: 8000, mid: 10000, premium: 15000 },
            transport: 'Flight',
            mustDo: true
          },
          {
            time: 'afternoon',
            title: 'Transfer to Varkala',
            description: 'Pre-paid taxi to Varkala Cliff (1.5 hrs). Check into Elixir Cliff or similar.',
            duration: '1.5 hrs',
            cost: { budget: 1500, mid: 1800, premium: 2500 },
            transport: 'Taxi',
            tip: 'Uber is unreliable; use Airport Pre-paid taxi counter.'
          },
          {
            time: 'evening',
            title: 'Sunset at Rock n Roll Cafe',
            description: 'Best sunset view point on the cliff. Live music often starts at 7 PM.',
            duration: '3 hrs',
            cost: { budget: 800, mid: 1500, premium: 2500 },
            mustDo: true,
            tip: 'Try the fresh grilled fish and cocktails.'
          }
        ]
      },
      {
        day: 2,
        title: 'Surf & Sand',
        activities: [
          {
            time: 'morning',
            title: 'Surf Lesson / Beach',
            description: 'Surf lesson at "Moon Waves" or "Soul & Surf". Or relax at Black Beach.',
            duration: '3 hrs',
            cost: { budget: 0, mid: 1500, premium: 2500 },
            mustDo: true,
            tip: 'Morning waves are best for beginners.'
          },
          {
            time: 'afternoon',
            title: 'Lunch at Abba German Bakery',
            description: 'Famous for fresh bread, pastries, and chill vibes. Good for a late brunch.',
            duration: '2 hrs',
            cost: { budget: 600, mid: 1000, premium: 1500 },
            tip: 'Try the prawn curry or bakery items.'
          },
          {
            time: 'evening',
            title: 'North Cliff Walk',
            description: 'Walk the entire cliff path. Shop for Tibetan handicrafts and spices.',
            duration: '2 hrs',
            cost: { budget: 500, mid: 1000, premium: 2000 },
            canSkip: true
          }
        ]
      },
      {
        day: 3,
        title: 'Hidden Gems: Kappil',
        activities: [
          {
            time: 'morning',
            title: 'Mangrove Kayaking',
            description: 'Travel to Kappil (15 min). Kayak through peaceful mangroves (Contact: Copa Cabana).',
            duration: '3 hrs',
            cost: { budget: 800, mid: 1000, premium: 1500 },
            mustDo: true,
            transport: 'Auto/Taxi',
            tip: 'Go early (8 AM) to beat the heat and see birds.'
          },
          {
            time: 'afternoon',
            title: 'Edava Beach Road',
            description: 'Scenic coastal road drive/walk. Less crowded than Varkala main beach.',
            duration: '2 hrs',
            cost: { budget: 300, mid: 500, premium: 1000 }
          },
          {
            time: 'evening',
            title: 'Dinner at Cafe del Mar',
            description: 'Upscale cliff dining. Great steaks, pasta, and romantic ambiance.',
            duration: '2 hrs',
            cost: { budget: 1000, mid: 2000, premium: 3000 },
            mustDo: true,
            tip: 'Reserve a cliff-edge table in advance.'
          }
        ]
      },
      {
        day: 4,
        title: 'Culture & Wellness',
        activities: [
          {
            time: 'morning',
            title: 'Janardhana Swamy Temple',
            description: 'Visit the 2000-year-old temple. Experience the authentic spiritual side.',
            duration: '1.5 hrs',
            cost: { budget: 0, mid: 0, premium: 0 },
            canSkip: true,
            tip: 'Dress conservatively (shoulders/knees covered).'
          },
          {
            time: 'afternoon',
            title: 'Ayurvedic Massage',
            description: 'Full body massage at a reputed center like "AyurSoul" or your resort.',
            duration: '2 hrs',
            cost: { budget: 1500, mid: 3000, premium: 5000 },
            mustDo: true,
            tip: 'Abhyanga (oil massage) is highly recommended.'
          },
          {
            time: 'evening',
            title: 'Final Sunset & Shopping',
            description: 'Last chance for souvenirs. Relax at "Darjeeling Cafe" for vibes.',
            duration: '3 hrs',
            cost: { budget: 800, mid: 1500, premium: 2500 }
          }
        ]
      },
      {
        day: 5,
        title: 'Departure',
        activities: [
          {
            time: 'morning',
            title: 'Lazy Breakfast',
            description: 'Enjoy a slow morning at the resort. Checkout by 11 AM.',
            duration: '2 hrs',
            cost: { budget: 500, mid: 1000, premium: 1500 }
          },
          {
            time: 'afternoon',
            title: 'Travel to Airport',
            description: 'Taxi to Trivandrum Airport. Maybe stop at Mall of Travancore for AC/Food.',
            duration: '3 hrs',
            cost: { budget: 1500, mid: 1800, premium: 2500 },
            transport: 'Taxi'
          },
          {
            time: 'evening',
            title: 'Fly Home',
            description: 'Flight back to origin city.',
            duration: '3 hrs',
            cost: { budget: 8000, mid: 10000, premium: 15000 },
            transport: 'Flight',
            mustDo: true
          }
        ]
      }
    ]
  },
  {
    id: 'sri-lanka',
    name: 'Sri Lanka (South Coast)',
    country: 'South Asia',
    heroImage: 'https://images.unsplash.com/photo-1586394461970-e7f9d0c0541b?w=800&q=80',
    recommendation: 'rushed',
    recommendationText: 'Optimized South Route',
    weather: { temp: '27-31°C', condition: 'Sunny/Humid', icon: 'sun' },
    priceRange: { budget: 50000, mid: 65000, premium: 85000 },
    flightCost: 18000,
    stayCost: '₹5-8K/night',
    duration: '5 Days',
    highlights: ['Mirissa Whales', 'Galle Fort', 'Unawatuna Beach', 'Turtle Hatchery'],
    notes: [
      'Route: Colombo -> Galle -> Mirissa -> Colombo (Skipping Kandy/Ella due to time)',
      'Visa: ETA required ($50)',
      'Best Base: Unawatuna or Mirissa for couples'
    ],
    itinerary: [
      {
        day: 1,
        title: 'Arrival & Transfer to Galle',
        activities: [
          {
            time: 'morning',
            title: 'Fly to Colombo (CMB)',
            description: 'Arrive early. Exchange currency. Buy SIM card (Dialog).',
            duration: '4 hrs',
            cost: { budget: 18000, mid: 22000, premium: 28000 },
            transport: 'Flight',
            mustDo: true
          },
          {
            time: 'afternoon',
            title: 'Highway to Galle',
            description: 'Take Expressway to Galle (2.5 hrs). Much faster than coastal road.',
            duration: '2.5 hrs',
            cost: { budget: 8000, mid: 10000, premium: 12000 },
            transport: 'Private Van',
            tip: 'Book a large van for 6 people + luggage beforehand.'
          },
          {
            time: 'evening',
            title: 'Galle Fort Sunset',
            description: 'Walk the ramparts of the Dutch Fort. Dinner at "Pedlar\'s Inn" or "A Minute by Tuk Tuk".',
            duration: '3 hrs',
            cost: { budget: 1500, mid: 2500, premium: 4000 },
            mustDo: true
          }
        ]
      },
      {
        day: 2,
        title: 'Unawatuna & Dalawella',
        activities: [
          {
            time: 'morning',
            title: 'Dalawella Beach (Frog Rock)',
            description: 'Iconic rope swing and "Frog Rock". Great for swimming and photos.',
            duration: '3 hrs',
            cost: { budget: 500, mid: 1000, premium: 1500 },
            mustDo: true,
            tip: 'Go early to avoid Instagram crowds at the swing.'
          },
          {
            time: 'afternoon',
            title: 'Unawatuna Beach Lunch',
            description: 'Relax at a beach shack like "Kingfisher". Safe swimming bay.',
            duration: '3 hrs',
            cost: { budget: 1000, mid: 2000, premium: 3000 }
          },
          {
            time: 'evening',
            title: 'Japanese Peace Pagoda',
            description: 'Short hike/tuk-tuk for a stunning sunset view over the ocean.',
            duration: '1.5 hrs',
            cost: { budget: 300, mid: 500, premium: 800 },
            canSkip: true
          }
        ]
      },
      {
        day: 3,
        title: 'Whales & Mirissa Vibes',
        activities: [
          {
            time: 'morning',
            title: 'Whale Watching',
            description: 'Early morning boat from Mirissa Harbour (6 AM). Blue Whales are common in March.',
            duration: '4 hrs',
            cost: { budget: 6000, mid: 8000, premium: 12000 },
            mustDo: true,
            transport: 'Boat',
            tip: 'Sea can be choppy; take motion sickness pills 30 mins prior.'
          },
          {
            time: 'afternoon',
            title: 'Coconut Tree Hill',
            description: 'Famous photo spot. Walk from Mirissa beach.',
            duration: '1.5 hrs',
            cost: { budget: 0, mid: 0, premium: 0 },
            tip: 'Very crowded at sunset; go mid-afternoon.'
          },
          {
            time: 'evening',
            title: 'Seafood Dinner on Beach',
            description: 'Tables set up on the sand with fresh catch on display. Romantic vibe.',
            duration: '3 hrs',
            cost: { budget: 2000, mid: 3500, premium: 5000 },
            mustDo: true
          }
        ]
      },
      {
        day: 4,
        title: 'Turtles & River Safari',
        activities: [
          {
            time: 'morning',
            title: 'Sea Turtle Hatchery',
            description: 'Visit a hatchery in Habaraduwa. Release baby turtles (ethical concerns vary).',
            duration: '1.5 hrs',
            cost: { budget: 1000, mid: 1500, premium: 2000 },
            canSkip: true
          },
          {
            time: 'afternoon',
            title: 'Madol Duwa River Safari',
            description: 'Boat safari on Koggala Lake. Visit Cinnamon Island.',
            duration: '2.5 hrs',
            cost: { budget: 2000, mid: 3000, premium: 5000 },
            transport: 'Boat'
          },
          {
            time: 'evening',
            title: 'Return to Colombo',
            description: 'Drive back to Colombo (2.5 hrs). Check into city hotel.',
            duration: '3 hrs',
            cost: { budget: 8000, mid: 10000, premium: 12000 },
            transport: 'Private Van'
          }
        ]
      },
      {
        day: 5,
        title: 'Colombo Shopping & Fly',
        activities: [
          {
            time: 'morning',
            title: 'Ministry of Crab (Optional)',
            description: 'World-famous crab restaurant. Expensive but iconic.',
            duration: '2 hrs',
            cost: { budget: 0, mid: 5000, premium: 15000 },
            canSkip: true,
            tip: 'Reservation mandatory days in advance.'
          },
          {
            time: 'afternoon',
            title: 'Shopping at Odel / Spa Ceylon',
            description: 'Buy teas, spa products, and souvenirs.',
            duration: '2 hrs',
            cost: { budget: 2000, mid: 5000, premium: 10000 }
          },
          {
            time: 'evening',
            title: 'Airport Transfer',
            description: 'Head to CMB Airport. Allow 1 hr for traffic.',
            duration: '2 hrs',
            cost: { budget: 2000, mid: 3000, premium: 4000 },
            transport: 'Taxi',
            mustDo: true
          }
        ]
      }
    ]
  },
  {
    id: 'ladakh',
    name: 'Ladakh',
    country: 'India',
    heroImage: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80',
    recommendation: 'unavailable',
    recommendationText: 'Too Risky (March)',
    weather: { temp: '-5 to 8°C', condition: 'Freezing', icon: 'cloud-snow' },
    priceRange: { budget: 35000, mid: 45000, premium: 65000 },
    flightCost: 15000,
    stayCost: '₹4-8K/night',
    duration: '6 Days',
    highlights: ['Frozen Pangong', 'Snow Covered Landscapes', 'Empty Monasteries'],
    seasonInfo: 'Season Starts: Late May',
    notes: [
      '❌ Roads (Manali/Srinagar) CLOSED',
      '⚠️ Pangong Lake: Frozen solid (-20°C night)',
      '⚠️ Chang La Pass: High risk of snow closure',
      '⚠️ Water in hotels: Pipes often frozen',
      '✅ Only for hardcore adventure, not for relaxed couples'
    ],
    itinerary: []
  }
];

const WeatherIcon = ({ type }: { type: 'sun' | 'cloud-snow' | 'alert' }) => {
  switch (type) {
    case 'sun': return <Sun className="w-5 h-5 text-amber-400" />;
    case 'cloud-snow': return <CloudSnow className="w-5 h-5 text-blue-400" />;
    case 'alert': return <AlertTriangle className="w-5 h-5 text-red-400" />;
  }
};

const RecommendationBadge = ({ type }: { type: 'recommended' | 'rushed' | 'unavailable' }) => {
  const styles = {
    recommended: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rushed: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    unavailable: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  
  const icons = {
    recommended: <Check className="w-3.5 h-3.5" />,
    rushed: <AlertTriangle className="w-3.5 h-3.5" />,
    unavailable: <X className="w-3.5 h-3.5" />
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[type]}`}>
      {icons[type]}
      {type === 'recommended' ? 'Recommended' : type === 'rushed' ? 'Rushed' : 'Unavailable'}
    </span>
  );
};

const TimeIcon = ({ time }: { time: TimeOfDay }) => {
  switch (time) {
    case 'morning': return <Sunrise className="w-4 h-4 text-amber-400" />;
    case 'afternoon': return <Sun className="w-4 h-4 text-orange-400" />;
    case 'evening': return <Sunset className="w-4 h-4 text-purple-400" />;
  }
};

const TransportIcon = ({ type }: { type?: string }) => {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('flight')) return <Plane className="w-3.5 h-3.5" />;
  if (t.includes('train')) return <Train className="w-3.5 h-3.5" />;
  if (t.includes('taxi') || t.includes('car')) return <Car className="w-3.5 h-3.5" />;
  if (t.includes('boat')) return <Ship className="w-3.5 h-3.5" />;
  return null;
};

interface DestinationCardProps {
  destination: Destination;
  priceTier: PriceTier;
  isExpanded: boolean;
  onToggle: () => void;
  onCompare: () => void;
  isComparing: boolean;
}

function DestinationCard({ destination, priceTier, isExpanded, onToggle, onCompare, isComparing }: DestinationCardProps) {
  const isUnavailable = destination.recommendation === 'unavailable';
  
  return (
    <motion.div
      layout
      className={`relative ${isUnavailable ? 'opacity-70' : ''}`}
    >
      <Card className={`overflow-hidden bg-claw-surface border-white/10 transition-all duration-300 ${
        isExpanded ? 'ring-2 ring-accent-primary/50' : 'hover:border-white/20'
      } ${isComparing ? 'ring-2 ring-cyan-500/50' : ''}`}>
        {/* Hero Image */}
        <div className="relative h-48 overflow-hidden">
          <img 
            src={destination.heroImage} 
            alt={destination.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${
              isExpanded ? 'scale-105' : 'hover:scale-105'
            } ${isUnavailable ? 'grayscale' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-claw-surface via-transparent to-transparent" />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <RecommendationBadge type={destination.recommendation} />
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
              <WeatherIcon type={destination.weather.icon} />
              <span className="text-xs font-medium text-white">{destination.weather.temp}</span>
            </div>
          </div>
          
          {isUnavailable && destination.seasonInfo && (
            <div className="absolute bottom-3 left-3 right-3">
              <div className="bg-red-500/90 backdrop-blur-sm px-3 py-2 rounded-lg text-center">
                <span className="text-sm font-bold text-white">{destination.seasonInfo}</span>
              </div>
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-accent-primary" />
                {destination.name}
              </CardTitle>
              <p className="text-sm text-accent-muted mt-1">{destination.country}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-accent-primary">
                ₹{(destination.priceRange[priceTier] / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-accent-muted">per person</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Info */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-lg p-2">
              <Calendar className="w-4 h-4 mx-auto text-accent-secondary mb-1" />
              <p className="text-xs font-medium text-white">{destination.duration}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <Plane className="w-4 h-4 mx-auto text-accent-secondary mb-1" />
              <p className="text-xs font-medium text-white">₹{(destination.flightCost/1000).toFixed(0)}K RT</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <Users className="w-4 h-4 mx-auto text-accent-secondary mb-1" />
              <p className="text-xs font-medium text-white">6 ppl</p>
            </div>
          </div>

          {/* Highlights */}
          <div className="flex flex-wrap gap-1.5">
            {destination.highlights.map((h, i) => (
              <Badge key={i} variant="secondary" className="bg-white/5 text-accent-muted text-xs">
                {h}
              </Badge>
            ))}
          </div>

          {/* Notes for unavailable */}
          {isUnavailable && destination.notes && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1">
              {destination.notes.map((note, i) => (
                <p key={i} className="text-xs text-red-300">{note}</p>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {!isUnavailable && (
              <Button 
                onClick={onToggle}
                className="flex-1 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary border border-accent-primary/30"
              >
                {isExpanded ? (
                  <>Hide Itinerary <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>View Itinerary <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            )}
            <Button 
              onClick={onCompare}
              variant="outline"
              className={`${isComparing ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'border-white/10'}`}
            >
              {isComparing ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Itinerary */}
      <AnimatePresence>
        {isExpanded && !isUnavailable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {destination.itinerary.map((day) => (
                <Card key={day.day} className="bg-claw-surface/50 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-accent-primary/20 flex items-center justify-center text-accent-primary text-sm font-bold">
                        {day.day}
                      </span>
                      {day.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {day.activities.map((activity, idx) => (
                      <div 
                        key={idx}
                        className="bg-white/5 rounded-lg p-3 border-l-2 border-accent-primary/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <TimeIcon time={activity.time} />
                              <h4 className="font-medium text-white text-sm">{activity.title}</h4>
                              {activity.mustDo && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5">
                                  Must Do
                                </Badge>
                              )}
                              {activity.canSkip && (
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px] px-1.5">
                                  Can Skip
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-accent-muted mb-2">{activity.description}</p>
                            
                            <div className="flex flex-wrap items-center gap-3 text-[10px]">
                              <span className="flex items-center gap-1 text-accent-secondary">
                                <Clock className="w-3 h-3" />
                                {activity.duration}
                              </span>
                              {activity.transport && (
                                <span className="flex items-center gap-1 text-accent-secondary">
                                  <TransportIcon type={activity.transport} />
                                  {activity.transport}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-accent-primary font-semibold">
                                <IndianRupee className="w-3 h-3" />
                                {activity.cost[priceTier].toLocaleString()}
                              </span>
                            </div>
                            
                            {activity.tip && (
                              <div className="mt-2 flex items-start gap-1.5 bg-amber-500/10 rounded px-2 py-1">
                                <Info className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                <span className="text-[10px] text-amber-300">{activity.tip}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CompareModal({ 
  destinations: dests, 
  priceTier, 
  onClose 
}: { 
  destinations: Destination[]; 
  priceTier: PriceTier;
  onClose: () => void;
}) {
  if (dests.length < 2) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-claw-surface border border-white/10 rounded-xl max-w-4xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-claw-surface border-b border-white/10 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent-primary" />
            Comparison
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-accent-muted font-medium">Feature</th>
                {dests.map(d => (
                  <th key={d.id} className="text-center py-3 px-2 text-white font-semibold">
                    {d.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-white/5">
                <td className="py-3 px-2 text-accent-muted">Status</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center">
                    <RecommendationBadge type={d.recommendation} />
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-2 text-accent-muted">Total Cost</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center text-accent-primary font-semibold">
                    ₹{(d.priceRange[priceTier]/1000).toFixed(0)}K/person
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-2 text-accent-muted">Flight Cost</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center text-white">
                    ₹{(d.flightCost/1000).toFixed(0)}K RT
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-2 text-accent-muted">Duration</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center text-white">
                    {d.duration}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-2 text-accent-muted">Weather</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <WeatherIcon type={d.weather.icon} />
                      <span className="text-white">{d.weather.temp}</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-2 text-accent-muted">Highlights</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center text-white text-xs">
                    {d.highlights.slice(0, 3).join(', ')}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-3 px-2 text-accent-muted">Group Cost (6 ppl)</td>
                {dests.map(d => (
                  <td key={d.id} className="py-3 px-2 text-center text-emerald-400 font-bold">
                    ₹{((d.priceRange[priceTier] * 6)/1000).toFixed(0)}K total
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function TripPlanner() {
  const [priceTier, setPriceTier] = useState<PriceTier>('mid');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const compareDestinations = destinations.filter(d => compareIds.includes(d.id));

  return (
    <div className="min-h-screen bg-claw-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-claw-surface/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-accent-muted hover:text-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plane className="w-5 h-5 text-accent-primary" />
                  Trip Planner
                </h1>
                <p className="text-xs text-accent-muted">5-6 Day Trip • 6 People • 3 Couples</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Price Tier Toggle */}
              <div className="flex bg-white/5 rounded-lg p-1">
                {(['budget', 'mid', 'premium'] as PriceTier[]).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setPriceTier(tier)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      priceTier === tier 
                        ? 'bg-accent-primary text-white' 
                        : 'text-accent-muted hover:text-white'
                    }`}
                  >
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* Compare Button */}
              {compareIds.length >= 2 && (
                <Button 
                  onClick={() => setShowCompare(true)}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Compare ({compareIds.length})
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Trip Info Banner */}
        <div className="mb-8 bg-gradient-to-r from-accent-primary/10 to-cyan-500/10 border border-accent-primary/20 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">March Trip Planning</h2>
              <p className="text-sm text-accent-muted">Saturday to Sunday • 5-6 days • Budget: ₹30-55K per person</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-primary" />
                <span className="text-white">6 Travelers</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent-primary" />
                <span className="text-white">5-6 Days</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-white">Varkala Recommended</span>
              </div>
            </div>
          </div>
        </div>

        {/* Destination Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              priceTier={priceTier}
              isExpanded={expandedId === destination.id}
              onToggle={() => toggleExpand(destination.id)}
              onCompare={() => toggleCompare(destination.id)}
              isComparing={compareIds.includes(destination.id)}
            />
          ))}
        </div>

        {/* Summary Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-6 py-3">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">
              Recommendation: Varkala, Kerala — Perfect balance of beaches, culture & relaxation!
            </span>
          </div>
        </div>
      </main>

      {/* Compare Modal */}
      <AnimatePresence>
        {showCompare && (
          <CompareModal 
            destinations={compareDestinations}
            priceTier={priceTier}
            onClose={() => setShowCompare(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
