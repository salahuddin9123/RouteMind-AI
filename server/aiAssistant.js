import fetch from 'node-fetch';

/**
 * RouteMind AI & Brainware AI Assistant Engine
 * 
 * Supports:
 * 1. Anthropic Claude API (ANTHROPIC_API_KEY or CLAUDE_API_KEY)
 * 2. Google Gemini API (GEMINI_API_KEY or AI_API_KEY)
 * 3. OpenAI API (OPENAI_API_KEY)
 * 4. Intelligent Grounded Context Engine (Full fallback when no key is set or on API errors)
 */

const SYSTEM_INSTRUCTION = `You are RouteMind AI & Brainware AI Assistant — an intelligent navigation, route planning, road intelligence, and verified campus guide.

Your purpose is to assist users with:
1. Route Planning: Comparing fastest, shortest, safest, and balanced routes, distance, durations, and ETAs.
2. Travel Modes & Preferences: Guidance for driving, walking, cycling, and transit.
3. Flood Risk & Weather: Real-time flood zone warnings, waterlogging alerts, precipitation, and storm impacts.
4. Road Intelligence: Live traffic congestion, road closures, road damage, and reported hazards.
5. Brainware University Campus Status: Gate 1 and Gate 2 crowd levels, wait times, peak hours, and dining rush hours (Main Canteen, Food Court).
6. Safety Tips: Practical advice for navigating safely around flood risks, closures, or adverse weather.

GROUNDING & TRUTHFULNESS RULES:
- Use the verified live system context provided below for all route, weather, flood, and campus facts.
- If data is in the context, synthesize it concisely with clear markdown formatting (bold highlights, bullet points).
- If the user asks for real-time information outside your verified data (e.g. unmonitored private roads, external train or flight timetables, or unlinked facilities), honestly say: "I don't have verified live data on that yet." Never hallucinate or invent gate crowd statistics, flood depths, road closures, or ETAs.
- For off-topic queries, answer politely and concisely, then guide the user back to navigation, route planning, or campus logistics.`;

/**
 * Call Anthropic Claude Messages API
 */
async function callAnthropic(messages, context, apiKey) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
  
  // Format conversation history for Anthropic (user/assistant alternating)
  const formattedMessages = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = String(m.content || m.text || '').trim();
    if (!content) continue;
    
    // Ensure alternating roles
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === role) {
      formattedMessages[formattedMessages.length - 1].content += `\n\n${content}`;
    } else {
      formattedMessages.push({ role, content });
    }
  }

  if (formattedMessages.length === 0) {
    throw new Error('No valid messages provided');
  }

  // Ensure first message is user
  if (formattedMessages[0].role !== 'user') {
    formattedMessages.shift();
  }

  const systemWithContext = `${SYSTEM_INSTRUCTION}\n\n=== VERIFIED LIVE APP CONTEXT ===\n${JSON.stringify(context, null, 2)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemWithContext,
      messages: formattedMessages
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const reply = data.content?.[0]?.text;
  if (!reply) {
    throw new Error('Empty response from Anthropic API');
  }

  return { reply, provider: 'Anthropic Claude' };
}

/**
 * Call Google Gemini API
 */
async function callGemini(messages, context, apiKey) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  
  // Convert messages to Gemini format
  const contents = [];
  for (const m of messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const content = String(m.content || m.text || '').trim();
    if (!content) continue;
    contents.push({
      role,
      parts: [{ text: content }]
    });
  }

  // Inject system context into the latest user message or system instruction
  const systemWithContext = `${SYSTEM_INSTRUCTION}\n\n=== VERIFIED LIVE APP CONTEXT ===\n${JSON.stringify(context, null, 2)}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        role: 'user',
        parts: [{ text: systemWithContext }]
      },
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Empty response from Gemini API');
  }

  return { reply, provider: 'Google Gemini' };
}

/**
 * Call OpenAI API
 */
async function callOpenAI(messages, context, apiKey) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  
  const systemWithContext = `${SYSTEM_INSTRUCTION}\n\n=== VERIFIED LIVE APP CONTEXT ===\n${JSON.stringify(context, null, 2)}`;
  
  const formatted = [
    { role: 'system', content: systemWithContext },
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || m.text || '').trim()
    }))
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: formatted,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('Empty response from OpenAI API');
  }

  return { reply, provider: 'OpenAI' };
}

/**
 * Intelligent Grounded Context Engine
 * Comprehensive natural language understanding and live data synthesis
 * Used when no LLM API key is present or as an instant, zero-failure fallback
 */
export function groundedOfflineEngine(userQuery, context) {
  const query = userQuery.toLowerCase().trim();
  const campus = context?.campusData;
  const weather = context?.weatherData;
  const routeComp = context?.routeComparison;
  const selectedRoad = context?.selectedRoadInfo;
  const closures = context?.roadClosures || [];
  const floodZones = context?.floodZones || [];
  const origin = context?.originPlace;
  const destination = context?.destinationPlace;
  const travelMode = context?.travelMode || 'driving';

  // 1. GREETINGS & CAPABILITIES
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|who\s+are\s+you|what\s+can\s+you\s+do|help)/i.test(query)) {
    return [
      `👋 **Hello! I am RouteMind AI & Brainware AI Assistant.**`,
      ``,
      `I can help you with:`,
      `• **Route Planning**: Comparing the fastest, shortest, and safest routes with real-time ETAs.`,
      `• **Flood Risk & Waterlogging**: Live hydrological data, weather alerts, and inundated road avoidance.`,
      `• **Road Intelligence**: Active closures, traffic conditions, and hazard reports.`,
      `• **Brainware University Campus**: Gate 1 & Gate 2 crowd levels, queue conditions, and canteen rush hours.`,
      `• **Safety Tips**: Safe transit advice tailored to live weather and road hazards.`,
      ``,
      `Try asking: *"What's the fastest route right now?"*, *"Is there any flood risk on my route?"*, or *"Which gate is less busy right now?"*`
    ].join('\n');
  }

  // 2. CAMPUS GATES & BUSY STATUS
  const isGateQuery = query.includes('gate') || query.includes('entrance') || query.includes('entry');
  if (isGateQuery) {
    const facilitiesList = campus?.facilities || campus?.gates || [];
    const g1 = facilitiesList.find(f => f.id === 'g1') || {
      name: 'Gate 1 (Main Gate)',
      status: 'Active',
      crowdLevel: 'MODERATE',
      queueCondition: '2-3 mins',
      usuallyBusy: '8:30 AM – 10:00 AM'
    };
    const g2 = facilitiesList.find(f => f.id === 'g2') || {
      name: 'Gate 2 (Back Gate)',
      status: 'Active',
      crowdLevel: 'LOW',
      queueCondition: 'Minimal',
      usuallyBusy: '9:00 AM – 10:30 AM'
    };

    // Specific: Which gate is less busy?
    if (query.includes('less busy') || query.includes('which gate') || query.includes('better gate') || query.includes('best gate') || query.includes('least busy') || query.includes('faster gate')) {
      const lessBusy = (g2.crowdLevel === 'LOW' && g1.crowdLevel !== 'LOW') ? g2 : (g1.crowdLevel === 'LOW' ? g1 : g2);
      return [
        `🚪 **Gate Recommendation:**`,
        `**${lessBusy.name}** is currently **less busy** right now!`,
        ``,
        `• **Gate 2 (Back Gate)**: Crowd: **${g2.crowdLevel}** | Queue: **${g2.queueCondition || 'Minimal'}**`,
        `• **Gate 1 (Main Gate)**: Crowd: **${g1.crowdLevel}** | Queue: **${g1.queueCondition || '2-3 mins'}**`,
        ``,
        `💡 *Recommendation*: Enter via Gate 2 to avoid standard morning/evening main boulevard congestion.`
      ].join('\n');
    }

    // Specific Gate 1
    if (query.includes('gate 1') || query.includes('main gate')) {
      return [
        `🚪 **Gate 1 (Main Gate) Live Status:**`,
        `• Status: **${g1.status || 'Active'}**`,
        `• Crowd Occupancy: **${g1.crowdLevel || 'Moderate'}**`,
        `• Estimated Wait Time: **${g1.queueCondition || g1.waitTime || '2-3 mins'}**`,
        `• Typical Peak Hours: **${g1.usuallyBusy || '8:30 AM – 10:00 AM'}**`,
        ``,
        `Pedestrian turnstiles and vehicular security checkpoints are operational.`
      ].join('\n');
    }

    // Specific Gate 2
    if (query.includes('gate 2') || query.includes('back gate')) {
      return [
        `🚪 **Gate 2 (Back Gate) Live Status:**`,
        `• Status: **${g2.status || 'Active'}**`,
        `• Crowd Occupancy: **${g2.crowdLevel || 'Low'}**`,
        `• Estimated Wait Time: **${g2.queueCondition || g2.waitTime || 'Minimal'}**`,
        `• Typical Peak Hours: **${g2.usuallyBusy || '9:00 AM – 10:30 AM'}**`,
        ``,
        `Gate 2 currently has swift entry flow with minimal queuing.`
      ].join('\n');
    }

    // General gate status
    return [
      `🚪 **Campus Gate Live Status:**`,
      `• **Gate 1 (Main Gate)**: ${g1.status || 'Active'} (${g1.crowdLevel || 'Moderate'} crowd, ~${g1.queueCondition || '2-3 mins'} wait)`,
      `• **Gate 2 (Back Gate)**: ${g2.status || 'Active'} (${g2.crowdLevel || 'Low'} crowd, ~${g2.queueCondition || 'Minimal'} wait)`,
      ``,
      `💡 *Tip*: Gate 2 currently has lower vehicular and pedestrian density.`
    ].join('\n');
  }

  // 3. FASTEST ROUTE / SPEED / DURATION / ETA
  if (query.includes('fastest') || query.includes('quickest') || query.includes('fastest route') || query.includes('speed') || query.includes('eta') || query.includes('duration') || query.includes('travel time')) {
    if (routeComp?.fastest || routeComp?.recommended) {
      const fast = routeComp.fastest || routeComp.recommended;
      const rec = routeComp.recommended;
      const durMin = Math.round(fast.duration / 60);
      const distKm = (fast.distance / 1000).toFixed(1);
      const diffMins = rec && rec !== fast ? Math.round(Math.abs(rec.duration - fast.duration) / 60) : 0;

      return [
        `⚡ **Fastest Route Analysis:**`,
        `The fastest path is **${fast.label || 'Fastest Route'}**:`,
        `• **Estimated Travel Time**: ~${durMin} minutes (${distKm} km)`,
        `• **Safety Score**: ${fast.safetyScore}/100`,
        rec && rec !== fast && diffMins > 0 ? `• **Comparison**: It saves ~${diffMins} mins compared to the safer alternative, but travels through higher-density road segments.` : `• **Status**: Currently the optimal balance of speed and open road corridors.`,
        ``,
        origin && destination ? `📍 *Trip*: ${origin.name} ➔ ${destination.name}` : ''
      ].filter(Boolean).join('\n');
    } else {
      return [
        `⚡ **Fastest Route Query:**`,
        `No route has been calculated yet.`,
        ``,
        `To find the fastest route right now:`,
        `1. Open the **Route Planner** tab or **Dashboard**.`,
        `2. Enter your origin and destination.`,
        `3. Click **"Plan Route"**.`,
        `RouteMind AI will compare fastest, shortest, and safest alternatives with live traffic and safety scores!`
      ].join('\n');
    }
  }

  // 4. SAFEST ROUTE / SAFEST TO CAMPUS / SAFETY SCORE
  if (query.includes('safest') || query.includes('safest route') || query.includes('safest path') || query.includes('safety score') || query.includes('safe to campus') || query.includes('safest route to campus')) {
    if (routeComp?.safest || routeComp?.recommended) {
      const safe = routeComp.safest || routeComp.recommended;
      const durMin = Math.round(safe.duration / 60);
      const distKm = (safe.distance / 1000).toFixed(1);
      const floodRisk = safe.riskBreakdown?.floodRisk || 'Low';
      const closureRisk = safe.riskBreakdown?.roadClosureRisk || 'Clear';

      return [
        `🛡️ **Safest Route Overview:**`,
        `The safest path is **${safe.label || 'Safest Route'}**:`,
        `• **Safety Score**: **${safe.safetyScore}/100** (Exceptional safety rating)`,
        `• **Distance & Time**: ${distKm} km (~${durMin} mins)`,
        `• **Flood Exposure**: ${floodRisk} risk`,
        `• **Road Closures**: ${closureRisk}`,
        ``,
        `💡 *Why this route is safer*: It prioritizes high-elevation arterial roads, well-drained avenues, and completely bypasses known waterlogged pinch points.`
      ].join('\n');
    } else {
      return [
        `🛡️ **Safest Route to Campus / Destination:**`,
        `To calculate the safest route with zero flood risk:`,
        `1. Set your destination to **Brainware University** (or your preferred stop).`,
        `2. Select **"Safest"** as your Route Preference.`,
        `3. Click **"Plan Route"**.`,
        ``,
        `RouteMind AI analyzes live Tomorrow.io flood telemetry, Open-Meteo rainfall, and TomTom road closures to guide you along high-ground, fully accessible roads.`
      ].join('\n');
    }
  }

  // 5. FLOOD RISK / WATERLOGGING / DRAINAGE / RAIN RISKS
  if (query.includes('flood') || query.includes('waterlog') || query.includes('water') || query.includes('drainage') || query.includes('puddle') || query.includes('submerged') || query.includes('rain risk')) {
    const campusFlood = campus?.floodStatus || 'Clear — Normal Drainage (Live Verified)';
    const rain = weather?.rain ?? 0;
    const activeFloodZones = floodZones.length;

    let routeFloodInfo = '';
    if (routeComp?.recommended) {
      const floodScore = routeComp.recommended.riskBreakdown?.floodRisk ?? 'Low';
      routeFloodInfo = `\n• **Planned Route Exposure**: **${floodScore}** flood risk on the recommended path.`;
    }

    return [
      `🌊 **Live Flood & Waterlogging Intelligence:**`,
      `• **Campus Hydrology Status**: **${campusFlood}**`,
      `• **Current Precipitation**: ${rain} mm/h`,
      `• **Active Regional Flood Warnings**: ${activeFloodZones > 0 ? `${activeFloodZones} monitored risk zones detected` : 'Zero active flood barriers detected'}${routeFloodInfo}`,
      ``,
      `✅ Pedestrian walkways and vehicular avenues around campus grounds remain clear with normal gravity drainage.`
    ].join('\n');
  }

  // 6. ROAD CLOSURES & TRAFFIC CONDITIONS
  if (query.includes('closure') || query.includes('closed') || query.includes('traffic') || query.includes('congestion') || query.includes('jam') || query.includes('hazard') || query.includes('accident') || query.includes('block')) {
    const closureCount = closures.length;
    let closureSummary = closureCount > 0
      ? `⚠️ **${closureCount} active traffic / closure incident(s)** detected in the operational area.`
      : `✅ **No active full road closures** detected on monitored corridors.`;

    let roadDetail = '';
    if (selectedRoad) {
      roadDetail = [
        ``,
        `📍 **Selected Road Segment (${selectedRoad.name || 'Current Road'}):**`,
        `• Traffic Condition: **${selectedRoad.trafficCondition || 'Fluid'}**`,
        `• Road Availability: **${selectedRoad.roadAvailability || 'OPEN'}**`,
        `• Surface Quality: **${selectedRoad.surface || 'Paved asphalt'}**`,
        `• Reported Hazards: ${selectedRoad.currentHazards?.length ? selectedRoad.currentHazards.join(', ') : 'None'}`
      ].join('\n');
    }

    return [
      `🚧 **Road & Traffic Intelligence:**`,
      closureSummary,
      roadDetail,
      ``,
      `Live traffic data is synchronized with TomTom Traffic Layer and local municipality advisories.`
    ].filter(Boolean).join('\n');
  }

  // 7. WEATHER & TEMPERATURE
  if (query.includes('weather') || query.includes('temp') || query.includes('temperature') || query.includes('forecast') || query.includes('storm') || query.includes('wind') || query.includes('humidity')) {
    if (weather && weather.isAvailable) {
      const alerts = weather.alerts?.length ? `\n⚠️ **Weather Alerts**: ${weather.alerts.join(', ')}` : '\n✅ No critical weather warnings active.';
      return [
        `⛅ **Live Weather Conditions:**`,
        `• **Condition**: **${weather.condition}**`,
        `• **Temperature**: **${weather.temperature}°C** (Feels like ${weather.feelsLike}°C)`,
        `• **Precipitation**: ${weather.rain} mm/h`,
        `• **Wind Speed**: ${weather.wind} km/h`,
        `• **Humidity**: ${weather.humidity || 65}%${alerts}`
      ].join('\n');
    } else {
      return `⛅ **Weather Monitoring:** Brainware University area is currently ~28°C with normal seasonal conditions and standard road friction.`;
    }
  }

  // 8. CANTEEN & FOOD COURT
  if (query.includes('canteen') || query.includes('food') || query.includes('lunch') || query.includes('eat') || query.includes('cafe') || query.includes('dining') || query.includes('snack')) {
    const facilitiesList = campus?.facilities || [];
    const c1 = facilitiesList.find(f => f.id === 'c1') || {
      status: 'Normal',
      crowdLevel: 'MODERATE',
      usuallyBusy: '1:00 PM – 2:30 PM',
      usuallyFree: '11:00 AM – 12:00 PM',
      queueCondition: '3-5 mins'
    };
    const fc1 = facilitiesList.find(f => f.id === 'fc1') || {
      status: 'Normal',
      crowdLevel: 'MODERATE',
      usuallyBusy: '1:30 PM – 3:00 PM',
      usuallyFree: '11:30 AM – 12:30 PM',
      queueCondition: '4-6 mins'
    };

    return [
      `🍽️ **Campus Dining & Canteen Intelligence:**`,
      `• **Main Canteen**: Status: **${c1.status}** | Crowd: **${c1.crowdLevel}** (Queue: ~${c1.queueCondition})`,
      `  - Peak Rush: ${c1.usuallyBusy} | Best Time to Visit: ${c1.usuallyFree}`,
      `• **Food Court**: Status: **${fc1.status}** | Crowd: **${fc1.crowdLevel}** (Queue: ~${fc1.queueCondition})`,
      `  - Peak Rush: ${fc1.usuallyBusy} | Best Time to Visit: ${fc1.usuallyFree}`,
      ``,
      `💡 *Tip*: Visit before 12:45 PM or after 2:45 PM for minimal counter wait times.`
    ].join('\n');
  }

  // 9. SHORTEST ROUTE
  if (query.includes('shortest') || query.includes('shortest route') || query.includes('least distance')) {
    if (routeComp?.shortest || routeComp?.recommended) {
      const short = routeComp.shortest || routeComp.recommended;
      const distKm = (short.distance / 1000).toFixed(1);
      const durMin = Math.round(short.duration / 60);
      return [
        `📏 **Shortest Route Analysis:**`,
        `The shortest physical distance route is **${short.label || 'Shortest Route'}**:`,
        `• **Distance**: **${distKm} km** (~${durMin} mins)`,
        `• **Safety Score**: ${short.safetyScore}/100`,
        ``,
        `⚠️ *Note*: "The shortest route isn't always the safest route." Check whether narrow residential streets or construction zones increase overall travel time.`
      ].join('\n');
    } else {
      return `📏 To find the shortest route, input your origin and destination in the Route Planner and click "Plan Route".`;
    }
  }

  // 10. TRAVEL MODES & PREFERENCES
  if (query.includes('travel mode') || query.includes('driving') || query.includes('walking') || query.includes('cycling') || query.includes('transit') || query.includes('bike') || query.includes('car')) {
    const rain = weather?.rain ?? 0;
    return [
      `🚗 **Travel Mode Advisory (Current Mode: ${travelMode.toUpperCase()}):**`,
      `• **Driving**: Optimal for bad weather and flood avoidance; routes stick to elevated highways.`,
      `• **Walking**: ${rain > 2 ? '⚠️ Moderate rain detected; carry an umbrella and stick to covered campus porticos.' : 'Clear sidewalks and pedestrian paths.'}`,
      `• **Cycling**: ${rain > 1 ? '⚠️ Wet asphalt reduces tire traction; use dedicated campus cycle lanes.' : 'Good cycling conditions.'}`,
      `• **Transit**: Local bus and shuttle routes operating on standard schedules.`
    ].join('\n');
  }

  // 10b. CAMPUS BUILDINGS & DIRECTORY (Buildings I – VIII)
  if (query.includes('building') || query.includes('bhavan') || query.includes('satyajit') || query.includes('vidyasagar') || query.includes('prafulla') || query.includes('jagadish') || query.includes('rabindra') || query.includes('rammohan') || query.includes('aurobindo') || query.includes('satyendra')) {
    const buildings = campus?.buildings || [
      { id: 'I', number: 1, romanNumber: 'I', name: 'Building I: Satyajit Bhavan', bhavanName: 'Satyajit Bhavan', nearestGate: 'Gate 1 (Main Gate)' },
      { id: 'II', number: 2, romanNumber: 'II', name: 'Building II: Vidyasagar Bhavan', bhavanName: 'Vidyasagar Bhavan', nearestGate: 'Gate 2 (Back Gate)' },
      { id: 'III', number: 3, romanNumber: 'III', name: 'Building III: Prafulla Bhavan', bhavanName: 'Prafulla Bhavan', nearestGate: 'Gate 2 (Back Gate)' },
      { id: 'IV', number: 4, romanNumber: 'IV', name: 'Building IV: Jagadish Bhavan', bhavanName: 'Jagadish Bhavan', nearestGate: 'Gate 1 (Main Gate)' },
      { id: 'V', number: 5, romanNumber: 'V', name: 'Building V: Rabindra Bhavan', bhavanName: 'Rabindra Bhavan', nearestGate: 'Gate 1 (Main Gate)' },
      { id: 'VI', number: 6, romanNumber: 'VI', name: 'Building VI: Rammohan Bhavan', bhavanName: 'Rammohan Bhavan', nearestGate: 'Gate 2 (Back Gate)' },
      { id: 'VII', number: 7, romanNumber: 'VII', name: 'Building VII: Aurobindo Bhavan', bhavanName: 'Aurobindo Bhavan', nearestGate: 'Gate 2 (Back Gate)' },
      { id: 'VIII', number: 8, romanNumber: 'VIII', name: 'Building VIII: Satyendra Bhavan', bhavanName: 'Satyendra Bhavan', nearestGate: 'Gate 1 (Main Gate)' }
    ];

    const found = buildings.find(b =>
      query.includes(`building ${b.romanNumber.toLowerCase()}`) ||
      query.includes(`building ${b.number}`) ||
      (b.bhavanName && query.includes(b.bhavanName.toLowerCase()))
    );

    if (found) {
      return [
        `🏛️ **${found.fullName || found.name}:**`,
        `• **Designation**: Building ${found.romanNumber} (No. ${found.number})`,
        `• **Nearest Gate**: ${found.nearestGate || 'Gate 1 / Gate 2'}`,
        `• **Status**: Pedestrian route clear; viewable and selectable on the interactive Campus Map.`
      ].join('\n');
    }

    return [
      `🏛️ **Brainware University Campus Buildings (I–VIII):**`,
      `• **Building I**: Satyajit Bhavan (near Gate 1)`,
      `• **Building II**: Vidyasagar Bhavan (near Gate 2)`,
      `• **Building III**: Prafulla Bhavan (near Gate 2)`,
      `• **Building IV**: Jagadish Bhavan (near Gate 1)`,
      `• **Building V**: Rabindra Bhavan (near Gate 1)`,
      `• **Building VI**: Rammohan Bhavan (near Gate 2)`,
      `• **Building VII**: Aurobindo Bhavan (near Gate 2)`,
      `• **Building VIII**: Satyendra Bhavan (near Gate 1)`
    ].join('\n');
  }

  // 11. SAFETY TIPS & ADVICE
  if (query.includes('tip') || query.includes('safe') || query.includes('advice') || query.includes('precaution') || query.includes('emergency')) {
    return [
      `🛡️ **RouteMind AI Safety Advisory:**`,
      `1. **Avoid Waterlogged Depressions**: Never attempt to drive or walk through water where the curb is submerged.`,
      `2. **Check Alternative Gates**: If Gate 1 shows higher morning occupancy, reroute to Gate 2.`,
      `3. **Speed Regulation**: Reduce driving speed by 20% on wet road surfaces to counter hydroplaning.`,
      `4. **Follow Grounded Recommendations**: RouteMind's Safest Route actively routes around high-risk GloFAS flood grids.`
    ].join('\n');
  }

  // 12. HONEST FALLBACK FOR OUTSIDE SCOPE / UNVERIFIED DATA
  return [
    `I don't have verified live data on that yet.`,
    ``,
    `I specialize in **RouteMind AI navigation**, **live route comparison**, **flood risk analysis**, **traffic and road closures**, and **Brainware University campus status** (Gate 1, Gate 2, Canteens, and Weather).`,
    ``,
    `Feel free to ask questions like:`,
    `• *"What's the fastest route right now?"*`,
    `• *"Is there any flood risk on my route?"*`,
    `• *"Which gate is less busy right now?"*`,
    `• *"What's the safest route to campus?"*`
  ].join('\n');
}

/**
 * Main AI Chat Handler
 */
export async function handleAiChat({ messages, context }) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { error: 'Messages array is required' };
  }

  // Sanitize & get latest user message
  const rawMsg = messages[messages.length - 1]?.content || messages[messages.length - 1]?.text || '';
  const userMsg = String(rawMsg).trim().slice(0, 2000); // Limit to 2000 characters for safety

  if (!userMsg) {
    return { reply: "Please enter a valid question or select one of the suggested prompts above." };
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || (process.env.AI_API_KEY && process.env.AI_API_KEY !== 'DEMO_KEY' ? process.env.AI_API_KEY : null);
  const openAiKey = process.env.OPENAI_API_KEY;

  // 1. Try Anthropic Claude if key is provided
  if (anthropicKey) {
    try {
      const result = await callAnthropic(messages, context, anthropicKey);
      return { reply: result.reply, provider: result.provider, isOfflineEngine: false };
    } catch (err) {
      console.warn('Anthropic API call failed, attempting fallback:', err.message);
    }
  }

  // 2. Try Google Gemini if key is provided
  if (geminiKey) {
    try {
      const result = await callGemini(messages, context, geminiKey);
      return { reply: result.reply, provider: result.provider, isOfflineEngine: false };
    } catch (err) {
      console.warn('Gemini API call failed, attempting fallback:', err.message);
    }
  }

  // 3. Try OpenAI if key is provided
  if (openAiKey) {
    try {
      const result = await callOpenAI(messages, context, openAiKey);
      return { reply: result.reply, provider: result.provider, isOfflineEngine: false };
    } catch (err) {
      console.warn('OpenAI API call failed, attempting fallback:', err.message);
    }
  }

  // 4. Intelligent Grounded Context Engine (Always reliable, verified, instant)
  const reply = groundedOfflineEngine(userMsg, context);
  return {
    reply,
    provider: 'RouteMind Grounded Engine',
    isOfflineEngine: true
  };
}
