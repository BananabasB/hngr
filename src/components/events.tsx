"use client";
import { useState, useEffect, useCallback } from "react";
import { loadGame, simulateGame } from "@/lib/simulation";
import { HngrDB, Tribute } from "@/lib/setup";
import { Gupter } from "next/font/google";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { Shuffle, Trash, ChevronLeft, ChevronRight } from "lucide-react";
import { remove } from "@/lib/localStorage";
import { useAppState } from "@/lib/state-context-refactored";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence, PanInfo } from "motion/react";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

type Props = {
  data: HngrDB;
};

function shuffleArray<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function EventTimeline({ data }: Props) {
  const { setDb } = useAppState();
  
  const [eventsByDay, setEventsByDay] = useState<Record<number, import('@/lib/setup').Event[]>>(() => {
    console.log('EventTimeline initializing:', {
      'data.events': data.events,
      'typeof data.events': typeof data.events,
      'data.events keys': data.events ? Object.keys(data.events) : 'none',
      'data.events length': data.events ? Object.keys(data.events).length : 0
    });
    
    // Check if events exist and have actual content
    if (data.events && Object.keys(data.events).length > 0) {
      console.log('Using saved events:', data.events);
      return data.events;
    } else {
      console.log('No saved events found, generating fresh ones');
      return simulateGame(data);
    }
  });

  // Save events function - call this explicitly when needed
  const saveEvents = useCallback(() => {
    if (setDb && data) {
      const updatedDb = { ...data, events: eventsByDay };
      setDb(updatedDb);
    }
  }, [setDb, data, eventsByDay]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const [skipShuffleConfirm, setSkipShuffleConfirm] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" &&
        localStorage.getItem("skipShuffleConfirm") === "1"
      );
    } catch (e) {
      return false;
    }
  });

  const [dontRemindAgain, setDontRemindAgain] = useState(false);

  const [maxDays, setMaxDays] = useState(10);
  const [enableMobileSwipe, setEnableMobileSwipe] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                           (typeof window !== "undefined" && window.innerWidth <= 768);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const generateShuffled = (db: HngrDB) => {
    // run a fresh simulation (simulateGame uses a deep-cloned db internally)
    const fresh = simulateGame(db, maxDays);
    const newByDay: Record<string, any[]> = {};
    for (const [day, events] of Object.entries(fresh)) {
      newByDay[day] = shuffleArray(events as any[]);
    }
    return newByDay;
  };

  const eraseAllData = () => {
    try {
      // this follows the pattern you showed earlier; erase your app DB key
      localStorage.removeItem("hngrDb");
      // also clear events and preferences to be safe
      localStorage.removeItem("events");
      localStorage.removeItem("skipShuffleConfirm");
    } catch (e) {}
    // do not reset in-memory state here
  };

  const doShuffle = (alsoRememberDontRemind = dontRemindAgain) => {
    if (alsoRememberDontRemind) {
      try {
        localStorage.setItem("skipShuffleConfirm", "1");
        setSkipShuffleConfirm(true);
      } catch (e) {}
    }

    // Deep clone data and reset tributes' health and alive status
    const clonedData: HngrDB = JSON.parse(JSON.stringify(data));
    for (const tributeId in clonedData.tributes) {
      const tribute = clonedData.tributes[tributeId];
      tribute.health = { mental: 100, physical: 100 };
    }

    const newEvents = generateShuffled(clonedData);

    try {
      const hngrDbString = localStorage.getItem("hngrDb");
      const hngrDb = hngrDbString ? JSON.parse(hngrDbString) : { ...data };
      hngrDb.events = newEvents;
      localStorage.setItem("hngrDb", JSON.stringify(hngrDb));
    } catch (e) {}

    setEventsByDay(newEvents);
    saveEvents(); // Save to database after shuffling
  };

  // Only shuffle if no events exist
  useEffect(() => {
    if (!data.events || Object.keys(data.events).length === 0) {
      doShuffle(skipShuffleConfirm || dontRemindAgain);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
      scale: 0.8,
    }),
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  const paginate = (newDirection: number) => {
    const days = Object.keys(eventsByDay).map(Number).sort((a, b) => a - b);
    if (newDirection > 0 && currentSlide < days.length - 1) {
      setCurrentSlide(currentSlide + 1);
      setDirection(newDirection);
    } else if (newDirection < 0 && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      setDirection(newDirection);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        paginate(-1);
      } else if (e.key === 'ArrowRight') {
        paginate(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSlide, eventsByDay]);

  const days = Object.keys(eventsByDay).map(Number).sort((a, b) => a - b);
  const currentDay = days[currentSlide];
  const currentEvents = currentDay ? eventsByDay[currentDay] : [];

  return (
    <div className="flex flex-col text-center p-4 gap-6">
      {/* shuffle button with confirmation dialog */}
      {skipShuffleConfirm || dontRemindAgain ? (
        <Button onClick={() => doShuffle()}>
          <Shuffle /> shuffle
        </Button>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Shuffle /> shuffle
            </Button>
          </DialogTrigger>

          <DialogContent className="flex flex-col content-center text-center justify-center items-center gap-4">
            <DialogHeader className="flex flex-col text-center content-center justify-center items-center">
              <DialogTitle>shuffle events?</DialogTitle>
              <DialogDescription className="text-center">
                this will clear your current stored events and replace them with
                a newly shuffled run.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm flex flex-row gap-3 justify-center">
              <Checkbox
                id="dont-remind-again"
                checked={dontRemindAgain}
                onCheckedChange={(checked) =>
                  setDontRemindAgain(checked === true)
                }
              />
              <Label htmlFor="dont-remind-again" className="select-none">
                don't remind me again
              </Label>
            </div>
            <div className="flex gap-2 items-center">
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    doShuffle();
                  }}
                >
                  <Shuffle /> shuffle now
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="secondary" className="cursor-pointer">
                  cancel
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* slider for maxDays */}
      <div className="flex flex-row items-center justify-center gap-4">
        <label htmlFor="maxDaysSlider" className="font-semibold">
          target length: {maxDays}
        </label>
        <Slider
          id="maxDaysSlider"
          value={[maxDays]}
          max={20}
          step={1}
          className="max-w-64"
          onValueChange={(vals) => setMaxDays(vals[0])}
        />
      </div>

      {/* Mobile swipe toggle - only show on mobile */}
      {isMobile && (
        <div className="flex flex-row items-center justify-center gap-3">
          <Checkbox
            id="enable-swipe"
            checked={enableMobileSwipe}
            onCheckedChange={(checked) => setEnableMobileSwipe(checked === true)}
          />
          <Label htmlFor="enable-swipe" className="select-none">
            enable swipe gestures
          </Label>
        </div>
      )}

      {/* Slide-based timeline */}
      {days.length > 0 && (
        <div className="relative w-full max-w-4xl mx-auto">
          {/* Navigation buttons */}
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => paginate(-1)}
              disabled={currentSlide === 0}
              className="z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-sm text-muted-foreground">
              day {currentDay} of {days.length}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => paginate(1)}
              disabled={currentSlide === days.length - 1}
              className="z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Slide container */}
          <div className="relative overflow-hidden rounded-lg" style={{ height: "600px" }}>
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentSlide}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                }}
                drag={isMobile && enableMobileSwipe ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                dragMomentum={false}
                onDragEnd={(e, { offset, velocity }: PanInfo) => {
                  if (!isMobile || !enableMobileSwipe) return;
                  
                  // Only trigger swipe if it's a clear, fast swipe gesture
                  const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y) * 2;
                  const hasVelocity = Math.abs(velocity.x) > 500;
                  const hasOffset = Math.abs(offset.x) > 100;
                  
                  if (isHorizontalSwipe && (hasVelocity || hasOffset)) {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) {
                      paginate(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                      paginate(-1);
                    }
                  }
                }}
                className="absolute inset-0 flex flex-col gap-6 p-6 bg-card border rounded-lg"
              >
                {/* Day header */}
                <motion.h2
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`text-4xl font-bold ${gupter.className}`}
                >
                  day {currentDay}
                </motion.h2>

                {/* Events for current day */}
                <div className="flex-1 overflow-y-auto">
                  {currentEvents.map((event: import('@/lib/setup').Event, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="flex flex-col items-center gap-4 mb-6"
                    >
                      {/* tribute avatars */}
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="flex flex-wrap justify-center gap-3"
                      >
                        {Object.values(event.roles).map((tributeId: string) => {
                          const tribute: Tribute | undefined = data.tributes[tributeId];
                          if (!tribute) return null;
                          return (
                            <motion.div
                              key={tribute.id}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className="flex flex-col items-center gap-2"
                            >
                              <Avatar className="w-16 h-16">
                                {tribute.image ? (
                                  <AvatarImage
                                    src={tribute.image}
                                    alt={tribute.name}
                                    className="object-cover"
                                  />
                                ) : (
                                  <AvatarFallback>{tribute.name[0]}</AvatarFallback>
                                )}
                              </Avatar>
                              
                            </motion.div>
                          );
                        })}
                      </motion.div>

                      {/* event description */}
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 + idx * 0.1 }}
                        className="text-lg leading-relaxed max-w-2xl"
                      >
                        {event.description.map((part: any, i: number) => {
                          if (typeof part === "string") return part;
                          const tribute = data.tributes[event.roles[part.role]];
                          if (!tribute) return null;
                          const [first, ...rest] = part.prop.split(".");
                          let value: any = (tribute as any)[first];
                          for (const key of rest) value = value?.[key];
                          return (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 + idx * 0.1 }}
                              className="font-semibold"
                            >
                              {value}
                            </motion.span>
                          );
                        })}
                      </motion.p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {days.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentSlide
                    ? "bg-primary w-8"
                    : "bg-muted hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to day ${days[index]}`}
              />
            ))}
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-muted-foreground mt-4">
            {isMobile ? (
              enableMobileSwipe ? (
                <>use arrow keys or swipe to navigate • click dots to jump to specific days</>
              ) : (
                <>use arrow keys or buttons to navigate • click dots to jump to specific days</>
              )
            ) : (
              <>use arrow keys or buttons to navigate • click dots to jump to specific days</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
