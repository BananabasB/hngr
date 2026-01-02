import { HungerGamesSimulation } from './hunger-games-sim';

// Test the simulation
const sim = new HungerGamesSimulation();
const result = sim.simulate();

console.log('Simulation completed!');
console.log('Winner:', result.winner?.name);
console.log('Final day:', result.finalDay);
console.log('Total events:', Object.values(result.events).reduce((sum, events) => sum + events.length, 0));
console.log('Events by day:', Object.keys(result.events).join(', '));
console.log('Day 1 events:', result.events[1]?.length || 0);
console.log('Day 1 sample:', result.events[1]?.[0]?.description);
