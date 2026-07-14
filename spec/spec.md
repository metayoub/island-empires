# Product Requirements Document

# Long-Term Browser Strategy Game

## Ikariam-Like Island Empire Builder

---

## 1. Product Overview

### 1.1 Product Name

**Working title:** Island Empires
**Genre:** Long-term browser strategy MMO
**Platform:** Web browser first, PWA/mobile browser later
**Business model:** 100% free and open source, with optional donations only
**Session style:** Low-pressure, asynchronous, persistent world

---

## 2. Product Vision

Create a persistent browser-based strategy game where players build island cities, manage resources, trade with other players, research technologies, join alliances, and grow their empire over weeks and months.

The game should feel calm, strategic, social, and rewarding without forcing players to stay online all day.

---

## 3. Core Product Hypothesis

Can players enjoy logging in every day to grow their island empire, trade resources, research technologies, and cooperate with other players?

### Expected Player Behavior

Players will log in every day because the game gives them steady progress, meaningful choices, and cooperative goals without forcing stressful or time-consuming sessions.

---

## 4. Product Positioning

### 4.1 One-Sentence Pitch

A calm long-term browser strategy game where players build island empires, trade rare resources, research technologies, and cooperate with alliances in a persistent world.

### 4.2 Product Identity

The game is not a fast mobile war game.

It is not designed around constant attacks, stressful push notifications, or aggressive pay-to-win mechanics.

It is also not designed around premium currency, paid boosts, paid convenience, or paid-only progression. The game must remain fully playable without purchases, and all core gameplay must be inspectable and self-hostable from the open-source project.

The game is designed for players who enjoy:

- Slow progression
- Resource optimization
- City building
- Trade
- Diplomacy
- Alliances
- Long-term planning
- Strategic PvP with protection
- Peaceful progression through economy and research

---

## 5. Target Audience

### 5.1 Primary Audience

Players who enjoy browser-based strategy games such as:

- City builders
- Empire management games
- Alliance strategy games
- Long-term MMO strategy games
- Resource management games
- Slow-paced asynchronous games

### 5.2 Player Profile

The target player:

- Has limited time per day
- Can log in 2 to 4 times daily
- Enjoys planning more than fast reactions
- Likes seeing progress over weeks and months
- Enjoys cooperation with other players
- Does not want to lose everything while offline
- Likes strategy, trade, diplomacy, and city optimization

---

## 6. Design Pillars

### 6.1 Low-Pressure Progression

Players should progress even if they do not stay online all day.

Core rules:

- No complete city destruction
- No permanent wipe of core progress
- No forced constant online presence
- No instant domination by paying players
- Beginner protection
- Vacation mode
- Attack cooldowns
- Warehouse protection
- Recovery after defeat

---

### 6.2 Long-Term Strategy

The game should remain interesting for months.

Long-term systems:

- Building upgrades
- Research trees
- Multiple cities
- City specialization
- Resource specialization
- Alliance projects
- Diplomacy
- Trade networks
- Events
- World rankings
- Late-game technologies

---

### 6.3 Social Dependency

Players should benefit from cooperation.

Social systems:

- Trade
- Alliances
- Resource donations
- Defensive support
- Alliance missions
- Shared projects
- Diplomacy
- Player messaging
- Alliance chat
- Trade agreements
- Peace agreements

---

### 6.4 Simple Interface, Deep Planning

The interface should be simple, but the strategy should be deep.

The player should easily understand:

- What resources they have
- What they can build
- What is missing
- How long actions take
- Why an upgrade matters
- What their next goal is

The depth should come from:

- Choosing city specializations
- Managing limited resources
- Planning research
- Trading efficiently
- Choosing where to expand
- Working with alliances
- Balancing defense, economy, and growth

---

## 7. Core Gameplay Loops

---

### 7.1 Short Session Loop

Typical duration: **2 to 5 minutes**

The player logs in and:

1. Checks notifications
2. Collects or reviews production
3. Starts a building upgrade
4. Starts or continues research
5. Sends resources or trade ships
6. Checks alliance messages
7. Logs out

---

### 7.2 Daily Loop

Typical frequency: **1 to 4 sessions per day**

The player:

1. Manages resources
2. Starts upgrades
3. Sends trade ships
4. Supports alliance members
5. Completes daily objectives
6. Trains units
7. Reviews market offers
8. Checks research progress
9. Plans expansion

---

### 7.3 Weekly Loop

The player:

1. Unlocks new research
2. Expands to another island
3. Participates in alliance projects
4. Joins events
5. Improves city specialization
6. Builds defensive or economic strategy
7. Negotiates trade or diplomacy

---

### 7.4 Monthly Loop

The player:

1. Develops a multi-city empire
2. Participates in regional politics
3. Joins alliance wars or peace agreements
4. Contributes to world wonders or monuments
5. Competes in rankings
6. Unlocks advanced buildings and technologies
7. Plans long-term resource chains

---

## 8. Player Personas

---

### 8.1 The Builder

The Builder enjoys upgrading cities and optimizing layouts.

Needs:

- Clear building progression
- City specialization
- Beautiful city view
- Meaningful upgrades
- Long-term construction goals

Main motivation:

> “I want to build the best empire possible.”

---

### 8.2 The Trader

The Trader enjoys economy, markets, and resource exchange.

Needs:

- Marketplace
- Trade routes
- Resource scarcity
- Regional economy
- Player-to-player trade
- Trade history

Main motivation:

> “I want to become rich through smart trading.”

---

### 8.3 The Diplomat

The Diplomat enjoys alliances and politics.

Needs:

- Alliances
- Messaging
- Diplomacy tools
- Treaties
- Alliance roles
- War and peace declarations
- Public alliance profiles

Main motivation:

> “I want to influence the world through relationships.”

---

### 8.4 The Strategist

The Strategist enjoys long-term planning and optimization.

Needs:

- Research trees
- City specialization
- Combat planning
- Trade planning
- Resource balancing
- Rankings

Main motivation:

> “I want to make better decisions than other players.”

---

### 8.5 The Casual Player

The Casual Player wants progress without stress.

Needs:

- Low-pressure progression
- Protection systems
- PvE content
- Clear quests
- Forgiving combat
- Offline-friendly gameplay

Main motivation:

> “I want to progress without being forced to play all day.”

---

## 9. Main Game Systems

---

# 10. Account and Lobby System

## 10.1 Features

- Account creation
- Email/password login
- Optional social login
- Password reset
- Email verification
- Player profile
- Avatar
- Player name
- Language selection
- World/server selection
- Recommended world for beginners
- Terms acceptance
- Privacy settings
- Account deletion request

---

## 10.2 World Selection

Each world is a separate game server.

World information shown to the player:

- World name
- World age
- Player population
- Speed settings
- Recommended status
- Beginner-friendly status
- Language/region
- Current event status

---

## 10.3 PM Notes

New players should not be placed into old worlds dominated by advanced players.

Recommended logic:

- Recommend fresh or young worlds
- Add beginner protection
- Add catch-up bonuses for older worlds
- Limit multi-account abuse

---

# 11. World and Server System

## 11.1 Features

- Multiple worlds
- World configuration
- World generation
- World map seed
- World opening date
- World speed
- Building speed
- Research speed
- Resource speed
- Trade speed
- Combat travel speed
- Max players per world
- World status
- World merge support
- Seasonal world support

---

## 11.2 World Types

### Persistent World

A long-term world that stays open for years.

Best for:

- Long-term players
- Alliances
- Diplomacy
- Stable community

---

### Seasonal World

A temporary world with faster progression and a clear end date.

Best for:

- Competitive players
- Special events
- Experiments
- Faster gameplay

---

## 11.3 Recommended Launch Choice

Start with:

- One persistent world
- Normal speed
- Beginner-friendly configuration
- Limited player cap
- Strong monitoring

Add seasonal worlds later.

---

# 12. World Map System

## 12.1 Purpose

The world map creates geography, neighbors, trade opportunities, conflict, diplomacy, and expansion strategy.

---

## 12.2 Features

- Ocean/world map
- Islands
- Coordinates
- Player cities
- Empty city slots
- Island resource type
- Island population
- Island bonuses
- City search
- Player search
- Alliance search
- Map filters
- Travel time preview
- Trade route preview
- Attack route preview
- Island details
- Neighbor list
- Strategic landmarks
- PvE locations
- Event locations

---

## 12.3 Map Entities

- Island
- City
- Port
- Resource mine
- Wonder
- Barbarian camp
- Trade hub
- Alliance area
- Event location
- Ruins
- Neutral city

---

## 12.4 Island Rules

Each island can contain:

- Limited city slots
- One main resource
- One luxury resource
- Shared production buildings
- Optional island wonder
- Neighbor cities
- PvE location

---

## 12.5 PM Notes

The map should make players care about location.

Good map design creates:

- Trade dependency
- Alliance clusters
- Strategic expansion
- Local politics
- Neighbor relationships
- Regional competition

---

# 13. City System

## 13.1 Purpose

The city is the player’s main emotional and strategic home.

Players should feel that their city is growing and becoming more powerful over time.

---

## 13.2 Features

- City overview
- Building slots
- Building construction
- Building upgrades
- Building requirements
- Building level
- Building details
- Building queue
- Demolish building
- Move building, optional
- City name
- City resource production
- City happiness
- City population
- City storage
- City defense
- City specialization

---

## 13.3 Building Slot Design

Recommended:

- Limited building slots
- Some fixed buildings
- Some flexible slots

Why:

- Creates strategy
- Prevents identical cities
- Encourages specialization
- Makes expansion meaningful

---

## 13.4 City Specialization Examples

A city can become:

- Resource city
- Research city
- Military city
- Naval city
- Trade city
- Defensive city
- Alliance support city
- Cultural city

---

# 14. Building System

## 14.1 Core Buildings

### City Hall

Purpose:

- Controls city level
- Increases population capacity
- Unlocks other features

---

### Warehouse

Purpose:

- Stores resources
- Protects resources from raids
- Increases storage capacity

---

### Academy

Purpose:

- Produces research points
- Allows scientists
- Unlocks technologies

---

### Barracks

Purpose:

- Trains land units
- Unlocks stronger units with upgrades

---

### Shipyard

Purpose:

- Builds naval units
- Builds trade ships or warships

---

### Port

Purpose:

- Enables trade
- Increases loading speed
- Improves transport

---

### Marketplace

Purpose:

- Enables resource trade
- Creates buy/sell offers
- Allows player economy

---

### Tavern

Purpose:

- Improves happiness
- Increases population growth
- Consumes wine or food

---

### Embassy

Purpose:

- Enables diplomacy
- Allows alliance creation/joining
- Provides diplomatic points

---

### City Wall

Purpose:

- Increases defense
- Protects against raids
- Improves survival

---

### Workshop

Purpose:

- Upgrades units
- Improves military efficiency

---

### Palace

Purpose:

- Allows colonization
- Controls number of cities
- Reduces administrative penalties

---

### Governor Residence

Purpose:

- Manages colonies
- Reduces corruption
- Improves city stability

---

## 14.2 Building Upgrade Rules

Each upgrade requires:

- Resources
- Time
- Previous building level
- Sometimes research
- Sometimes population
- Sometimes another building

---

## 14.3 Construction Queue

Default:

- One active construction per city

Possible free convenience option:

- Queue next building
- Add planning queue
- Keep second active construction out of the default design unless it is earned fully through gameplay

---

## 14.4 PM Notes

Every building should have a clear purpose.

A building should support one or more of these pillars:

- Economy
- Research
- Trade
- Military
- Defense
- Diplomacy
- Expansion
- Happiness
- Alliance cooperation

---

# 15. Resource System

## 15.1 Purpose

Resources drive all progression.

They create:

- Strategic choices
- Trade needs
- Island specialization
- Conflict opportunities
- Alliance cooperation

---

## 15.2 Recommended MVP Resources

### Basic Resources

- Wood
- Gold

### Luxury / Strategic Resources

- Marble
- Wine
- Crystal
- Sulfur

---

## 15.3 Resource Usage

### Wood

Used for:

- Basic buildings
- Ships
- Units
- Early upgrades

---

### Marble

Used for:

- Advanced buildings
- City upgrades
- Defensive structures

---

### Wine

Used for:

- Happiness
- Population growth
- Taverns
- Cultural events

---

### Crystal

Used for:

- Research
- Academy upgrades
- Technology
- Unit improvements

---

### Sulfur

Used for:

- Military units
- Warships
- Advanced weapons

---

### Gold

Used for:

- Unit upkeep
- Trade
- Maintenance
- Marketplace
- Diplomacy costs

---

## 15.4 Resource Features

- Passive production
- Worker assignment
- Production rate per hour
- Resource storage
- Warehouse capacity
- Warehouse protection
- Resource overflow warning
- Transport between cities
- Trade with players
- Resource donations
- Production bonuses
- Production penalties
- Temporary boosts
- Event bonuses

---

## 15.5 Worker Assignment

Players can assign citizens to:

- Wood production
- Luxury resource production
- Research
- Gold generation
- Military service

---

## 15.6 PM Notes

Resource design should force cooperation without blocking solo players.

Important balance:

- Players should often need resources from other islands
- Trade should be useful
- Resource scarcity should create decisions
- Shortage should slow progression, not stop it completely

---

# 16. Population and Happiness System

## 16.1 Purpose

Population gives cities life and creates internal management.

---

## 16.2 Features

- Population count
- Population capacity
- Population growth
- Happiness score
- Citizen assignment
- Workers
- Scientists
- Soldiers
- Merchants
- Unemployed citizens
- Housing capacity
- Happiness buildings
- Culture bonus
- Overpopulation penalty
- Unrest penalty

---

## 16.3 Happiness Sources

- Tavern
- Wine distribution
- Cultural buildings
- Museum
- Research
- Events
- Cosmetic event rewards
- Alliance festival

---

## 16.4 Negative Factors

- Overpopulation
- High taxes, if tax system exists
- Lack of wine/food
- War exhaustion
- Occupation, if added
- Corruption from over-expansion

---

## 16.5 Low-Pressure Rule

Low happiness should reduce growth and efficiency.

It should not instantly destroy the city or make the player lose everything.

---

# 17. Research and Technology System

## 17.1 Purpose

Research gives long-term goals and unlocks strategic depth.

---

## 17.2 Features

- Research points
- Scientists
- Academy
- Research queue
- Research branches
- Technology requirements
- Unlock buildings
- Unlock units
- Unlock ships
- Unlock bonuses
- Unlock city expansion
- Unlock trade features
- Unlock diplomacy features
- Late-game technologies
- Repeatable research, optional

---

## 17.3 Research Branches

### Economy

Unlocks:

- Better production
- Cheaper buildings
- Higher warehouse capacity
- Faster transport loading
- Better marketplace
- Lower upkeep

---

### Science

Unlocks:

- Faster research
- Advanced buildings
- Better scouting
- Research efficiency
- Crystal efficiency

---

### Military

Unlocks:

- Stronger units
- Unit upgrades
- Better defense
- Siege units
- Improved morale

---

### Navigation

Unlocks:

- Faster ships
- More cargo capacity
- Colonization
- Naval units
- Better blockades
- Longer trade routes

---

### Diplomacy

Unlocks:

- Alliances
- Treaties
- Embassy upgrades
- Alliance roles
- Trade agreements
- Peace agreements

---

## 17.4 PM Notes

Research should create anticipation.

Players should think:

> “Tomorrow I unlock something important.”

---

# 18. Expansion and Colonization

## 18.1 Purpose

Expansion is one of the biggest long-term milestones.

It allows the player to access new resources and build a real empire.

---

## 18.2 Features

- Found new city
- Colony ship
- Settlers
- Required research
- Required palace level
- Required resources
- City limit
- Distance-based travel time
- Island selection
- Empty city slots
- New city setup
- Colony maintenance
- Governor residence
- Corruption or administration penalty
- Relocation option
- Abandon city option with cooldown

---

## 18.3 Expansion Rules

A player should need:

- Enough resources
- Required research
- Available city slot
- Colony ship
- Palace or administration level

---

## 18.4 First Expansion Timing

Recommended:

- The first new city should be reachable within the first few days.
- It should feel like a major achievement.
- It should unlock access to another resource.

---

## 18.5 PM Notes

Expansion creates:

- Resource independence
- New strategic choices
- Map exploration
- Player commitment
- Long-term retention

---

# 19. Trade and Transport System

## 19.1 Purpose

Trade is central to a low-pressure strategy game.

It gives peaceful players a strong role and makes geography meaningful.

---

## 19.2 Features

- Trade ships
- Cargo capacity
- Travel time
- Send resources between own cities
- Send resources to other players
- Marketplace
- Buy offers
- Sell offers
- Trade history
- Trade reports
- Trade notifications
- Trade route templates
- Alliance-only trade
- Trade tax
- Trade range
- Transport cancellation
- Trade arrival time
- Marketplace filters

---

## 19.3 Types of Trade

### Internal Transport

Resources moved between the player’s own cities.

---

### Direct Player Trade

One player sends resources to another player.

---

### Marketplace Trade

Players create offers:

- Sell X resource for Y resource
- Buy X resource with gold
- Exchange one resource for another

---

### Alliance Trade

Trade restricted to alliance members.

---

## 19.4 Trade Constraints

Trade should be limited by:

- Ship availability
- Cargo capacity
- Distance
- Travel time
- Marketplace level
- Trade agreements
- Anti-abuse rules

---

## 19.5 PM Notes

Avoid instant global trade in the early product.

Instant global trade removes:

- Geography
- Local politics
- Trade route planning
- Island identity
- Strategic scarcity

---

# 20. Diplomacy System

## 20.1 Purpose

Diplomacy creates stories, politics, and social retention.

---

## 20.2 Features

- Player profile
- Send message
- Friend list
- Block list
- Trade agreement
- Peace agreement
- Non-aggression pact
- Alliance pact
- War declaration
- Ceasefire
- Diplomatic notes
- Embassy points
- Public diplomacy status
- Alliance diplomacy page

---

## 20.3 Diplomatic Statuses

Possible statuses:

- Neutral
- Friendly
- Trade partner
- Non-aggression pact
- Alliance partner
- At war
- Ceasefire
- Blocked

---

## 20.4 PM Notes

Diplomacy should be simple in MVP.

MVP should include:

- Messaging
- Alliances
- Public alliance profile
- War/peace status
- Trade agreements later

---

# 21. Alliance System

## 21.1 Purpose

Alliances create social identity, protection, cooperation, and long-term retention.

---

## 21.2 Features

- Create alliance
- Join alliance
- Apply to alliance
- Invite player
- Alliance tag
- Alliance name
- Alliance description
- Alliance logo
- Public alliance page
- Member list
- Member activity indicator
- Alliance roles
- Alliance announcements
- Alliance chat
- Alliance forum
- Shared reports
- Alliance diplomacy
- Alliance treasury
- Alliance projects
- Alliance donations
- Alliance missions
- Alliance rankings
- Alliance war logs

---

## 21.3 Alliance Roles

Recommended roles:

- Leader
- Co-leader
- General
- Diplomat
- Recruiter
- Treasurer
- Officer
- Member
- Recruit

---

## 21.4 Alliance Permissions

Permissions can include:

- Accept members
- Remove members
- Edit description
- Send announcement
- Manage diplomacy
- Start alliance mission
- View shared reports
- Manage treasury
- Declare war
- Sign peace

---

## 21.5 Alliance Cooperation Features

- Donate resources to alliance project
- Send defensive support
- Share trade requests
- Coordinate PvE events
- Help new members
- Build alliance monument
- Unlock alliance bonuses

---

## 21.6 PM Notes

Alliance participation should be valuable but not mandatory.

Solo players should still progress, but alliance players should experience better cooperation and social retention.

---

# 22. Communication System

## 22.1 Features

- Inbox
- Player messages
- System messages
- Battle reports
- Trade reports
- Spy reports
- Alliance messages
- Alliance announcements
- Chat
- Alliance chat
- Report message
- Block user
- Mute user
- Message templates
- Notification center

---

## 22.2 Message Types

- Personal message
- Alliance message
- System notification
- Battle report
- Trade report
- Research report
- Construction report
- Spy report
- Event message
- Admin message

---

## 22.3 Moderation Requirements

Must include:

- Report player
- Report message
- Mute player
- Block player
- Admin review
- Chat logs
- Warning system
- Ban system

---

# 23. Military System

## 23.1 Purpose

Combat should create strategy and tension without making the game stressful or destructive.

---

## 23.2 Features

- Recruit units
- Unit training queue
- Unit upkeep
- Unit categories
- Unit stats
- Attack
- Defense
- Speed
- Cargo
- Morale
- Health
- Training time
- Resource cost
- Research requirement
- Unit upgrades
- Army movement
- Reinforcement
- Recall army
- Battle reports
- Loot calculation
- Casualty calculation
- Retreat
- Defense support

---

## 23.3 Unit Categories

Recommended MVP categories:

- Infantry
- Ranged units
- Cavalry
- Siege units
- Support units
- Defensive units

---

## 23.4 Combat Actions

- Raid
- Attack
- Defend
- Reinforce ally
- Scout
- Blockade, naval
- Recall
- Retreat

---

## 23.5 Low-Pressure Combat Rules

Combat should not destroy months of work.

Rules:

- Cities cannot be deleted by attacks
- Buildings cannot be permanently destroyed in MVP
- Loot is capped
- Warehouse protects resources
- Beginner protection exists
- Repeated attacks are limited
- Players can recover
- Vacation mode exists
- Defeated armies return partially or are recoverable, optional

---

## 23.6 PM Notes

PvP should create stories, not rage quits.

The key metric is:

> Does the player come back after losing a battle?

---

# 24. Naval System

## 24.1 Purpose

Because the world is island-based, naval gameplay should be meaningful.

---

## 24.2 Features

- Trade ships
- Warships
- Naval transport
- Naval battle
- Blockade
- Port defense
- Shipyard
- Cargo capacity
- Sea travel time
- Escort trade ships
- Naval reports

---

## 24.3 MVP Naval Scope

For MVP, include:

- Trade ships
- Transport between islands
- Basic warships
- Basic blockade
- Naval battle report

Avoid for MVP:

- Complex sea territory control
- Advanced naval formations
- Real-time naval battle animation

---

# 25. Scouting and Intelligence

## 25.1 Purpose

Scouting creates strategy before combat and trade decisions.

---

## 25.2 Features

- Spy unit
- Spy building
- Spy mission
- View city resources
- View city army
- View city buildings
- View warehouse level
- Counter-spy
- Spy detection
- Spy success chance
- Spy report
- Alliance spy sharing

---

## 25.3 Spy Mission Types

- Resource report
- Army report
- Building report
- Research report, optional
- Trade activity report, optional

---

## 25.4 PM Notes

Scouting should be useful but limited.

Avoid allowing players to spam spy missions constantly.

---

# 26. PvE System

## 26.1 Purpose

PvE gives players content without requiring attacks against other players.

This is essential for low-pressure gameplay.

---

## 26.2 PvE Features

- Barbarian villages
- Pirate camps
- Ancient ruins
- Neutral cities
- Sea monsters, optional
- PvE missions
- PvE levels
- PvE rewards
- PvE battle reports
- Alliance PvE events
- Weekly PvE objectives

---

## 26.3 PvE Rewards

- Resources
- Gold
- Research points
- Temporary boosts
- Cosmetic rewards
- Event points
- Alliance points

---

## 26.4 PM Notes

PvE should teach combat safely.

It should also give casual players something meaningful to do.

---

# 27. Quest and Mission System

## 27.1 Purpose

Quests guide the player and give short-term goals.

---

## 27.2 Quest Types

- Tutorial quests
- Main progression quests
- Daily quests
- Weekly quests
- Alliance quests
- Event quests
- Achievement quests
- Combat quests
- Trade quests
- Research quests
- Expansion quests

---

## 27.3 Tutorial Quest Examples

- Upgrade City Hall to level 2
- Build a Warehouse
- Assign workers to wood production
- Build an Academy
- Start your first research
- Build a Port
- Send your first trade ship
- Train your first unit
- Defeat a barbarian camp
- Join or create an alliance
- Found a second city

---

## 27.4 Rewards

- Resources
- Gold
- Research points
- Temporary boosts
- Trade ships
- Cosmetic items
- Cosmetic items

---

## 27.5 PM Notes

Quests should guide the player, not become chores.

Avoid forcing too many daily tasks.

---

# 28. Tutorial and Onboarding

## 28.1 Onboarding Goal

The player should understand the core game in the first session and want to return later.

---

## 28.2 First Session Objectives

The player should learn:

1. Build
2. Produce resources
3. Assign workers
4. Research
5. Use the map
6. Trade
7. Train units
8. Understand alliances
9. Understand long-term timers

---

## 28.3 First 30-Minute Experience

Recommended sequence:

1. Create account
2. Select world
3. Name first city
4. Build or upgrade City Hall
5. Assign workers to wood
6. Build Warehouse
7. Build Academy
8. Start research
9. Open world map
10. See neighboring cities
11. Build Port
12. Send first transport
13. Fight first PvE camp
14. Receive reward
15. Get next long-term goal

---

## 28.4 Beginner Protection

Beginner protection should include:

- No attacks for first days
- Limited scouting
- Protection removed if player attacks others
- Clear timer showing protection end
- Protection extension optional for inactive players

---

# 29. Progression System

## 29.1 Progression Types

- City progression
- Building progression
- Research progression
- Military progression
- Trade progression
- Alliance progression
- Expansion progression
- Achievement progression
- Ranking progression

---

## 29.2 Player Score

Player score can include:

- Building levels
- Research unlocked
- Cities owned
- Military strength
- Trade activity
- Alliance contribution
- Achievements

---

## 29.3 Achievements

Achievement examples:

- First city upgrade
- First research
- First trade
- First alliance
- First colony
- First PvE victory
- First marketplace sale
- First defensive victory
- 7 days active
- 30 days active

---

# 30. Rankings and Leaderboards

## 30.1 Features

- Player ranking
- Alliance ranking
- City ranking
- Economy ranking
- Research ranking
- Military ranking
- Trade ranking
- Event ranking
- Weekly ranking
- Historical ranking

---

## 30.2 PM Notes

Leaderboards motivate competitive players.

For casual players, also show:

- Personal progress
- Friends ranking
- Alliance ranking
- Nearby island ranking
- “You improved X positions this week”

---

# 31. Events and Live Operations

## 31.1 Purpose

Events keep the game alive after launch.

---

## 31.2 Event Types

- Resource production event
- Research bonus event
- Trade fair
- Alliance donation event
- PvE invasion
- Island festival
- Seasonal festival
- Monument construction event
- Peace week
- Naval expedition event
- New server launch event

---

## 31.3 Low-Pressure Event Rules

Events should:

- Reward participation
- Avoid punishing missed days
- Avoid forcing constant logins
- Offer catch-up options
- Support solo and alliance play
- Avoid pay-to-win advantages

---

## 31.4 Live-Ops Calendar

Recommended rhythm:

- Small event every week
- Medium event every month
- Major event every quarter
- Seasonal event during holidays
- New server opening only when needed

---

# 32. Supporter Funding

## 32.1 Support Philosophy

The game should be 100% free and open source.

Optional donations may support hosting, development, maintenance, and future updates, but donations must not sell gameplay advantage.

---

## 32.2 Acceptable Donation Acknowledgements

- City skins
- Avatar frames
- Alliance banners
- Cosmetic map effects
- Supporter badges
- Public supporter credits, optional

---

## 32.3 Features to Avoid

Never sell:

- Unlimited resources
- Exclusive powerful units
- Instant army rebuilds
- Paid-only research
- Paid attack immunity abuse
- Overpowered production boosts
- Direct victory points
- Uncapped speedups
- Paid construction queues
- Paid trade routes
- Paid detailed statistics
- Paid battle simulators
- Paid advanced filters
- Paid notification options
- Paid vacation extensions

---

## 32.4 PM Rule

Players who never donate must receive the complete game.

Donating should only express support for the project.

---

# 33. Supporter Donations

## 33.1 Features

- Optional supporter donations
- Donation history
- Cosmetic supporter acknowledgements
- Refund handling
- Fraud detection
- Receipt emails
- Public fairness promise

---

## 33.2 Supporter Categories

- Supporter badges
- Cosmetic avatar frames
- Cosmetic city skins
- Cosmetic alliance banners
- Public supporter credits, optional

---

## 33.3 PM Notes

Island Empires should not have a premium shop at launch.

Supporter donations must never sell resources, units, combat power, production boosts, speedups, paid-only research, paid-only buildings, victory points, or strategic advantages.

Avoid making players evaluate whether a paid item is fair. The default product impression should be: free forever, open source, donations optional.

---

# 34. Notifications

## 34.1 Notification Types

- Building completed
- Research completed
- Trade arrived
- Army arrived
- Incoming attack
- Message received
- Alliance announcement
- Warehouse full
- Event ending
- Beginner protection ending
- Vacation mode ending

---

## 34.2 Channels

- In-game notification
- Email notification
- Browser push notification
- PWA push notification later

---

## 34.3 PM Notes

Notifications should help players.

They should not create anxiety or pressure.

Players should be able to configure notification preferences.

---

# 35. Admin and Moderation Tools

## 35.1 Admin Dashboard Features

- Player search
- City search
- World status
- Resource audit
- Player inventory
- Trade history
- Battle history
- Payment history
- Account status
- Ban player
- Mute player
- Warn player
- Suspend player
- Delete message
- Review reports
- View logs
- Configure events
- Configure world speed
- Send global message
- Refund tools
- Support notes

---

## 35.2 Moderation Features

- Report player
- Report message
- Chat moderation
- Mute system
- Warning system
- Temporary ban
- Permanent ban
- Appeal notes
- Admin audit log

---

## 35.3 PM Notes

Admin tools are not optional.

In multiplayer strategy games, abuse, harassment, and multi-accounting must be handled from the beginning.

---

# 36. Anti-Cheat and Abuse Prevention

## 36.1 Common Abuse Cases

- Multi-accounting
- Resource pushing
- Botting
- Marketplace abuse
- Fake alliance accounts
- Repeated farming of weak players
- Payment fraud
- Chat harassment
- Script automation

---

## 36.2 Anti-Abuse Features

- Rate limiting
- Server-side validation
- Suspicious trade detection
- Multi-account detection
- IP/device risk scoring
- Bot behavior detection
- Marketplace monitoring
- Repeated attack detection
- Admin review queue
- Action audit logs
- CAPTCHA only when suspicious

---

## 36.3 Anti-Pushing Rules

The system should detect:

- One-way resource transfers
- Repeated unfair trades
- Strong accounts receiving resources from weak accounts
- Multiple accounts on same IP trading heavily
- New accounts feeding old accounts

---

## 36.4 PM Notes

Do not trust the frontend.

All economy, combat, and resource operations must be validated server-side.

---

# 37. UX and UI Requirements

## 37.1 Main Screens

- Login
- World selection
- City view
- Building details
- Construction queue
- Resource bar
- Research screen
- World map
- Island view
- Trade screen
- Marketplace
- Barracks
- Shipyard
- Military overview
- Alliance screen
- Inbox
- Reports
- Rankings
- Quests
- Support project
- Profile
- Settings
- Help/wiki
- Admin dashboard

---

## 37.2 UI Principles

- Fast loading
- Clear timers
- Clear resource display
- Clear upgrade benefits
- Clear shortage messages
- Responsive design
- Works on desktop browser
- Works on mobile browser later
- Minimal heavy animation
- Accessible fonts
- Good contrast
- Tooltips
- Search and filters
- Strong notification center

---

## 37.3 City View Requirements

City view should show:

- Current city name
- Resources
- Population
- Happiness
- Active construction
- Available buildings
- Upgrade buttons
- Building levels
- Production summary
- Warnings
- Next recommended action

---

## 37.4 Map View Requirements

Map view should show:

- Islands
- Cities
- Player names
- Alliance tags
- Empty slots
- Resource type
- Distance
- Travel time
- Action buttons
- Search
- Filters

---

# 38. Technical Architecture

## 38.1 Recommended Frontend

Possible stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- WebSocket client
- PWA support
- Responsive UI

---

## 38.2 Recommended Backend

Possible stack:

- Node.js / NestJS
- PostgreSQL
- Redis
- WebSocket gateway
- Background job queue
- REST API or GraphQL
- Admin API
- Payment integration

---

## 38.3 Main Backend Services

- Authentication service
- Player service
- World service
- City service
- Building service
- Resource service
- Research service
- Trade service
- Combat service
- Alliance service
- Messaging service
- Notification service
- Payment service
- Admin service
- Analytics service

---

## 38.4 Database

Recommended:

- PostgreSQL for core data
- Redis for caching and job queues
- Object storage for images/assets
- Event log tables for auditability

---

## 38.5 Timer and Job System

The game needs reliable background jobs for:

- Building completion
- Research completion
- Trade arrival
- Army arrival
- Battle resolution
- Event start/end
- Notification sending
- Resource production calculation
- Vacation mode expiration

---

## 38.6 PM Warning

Timer-based strategy games look simple, but they are technically complex.

The most important backend requirement is reliability.

Players must never lose progress because of broken timers or failed jobs.

---

# 39. Data Model Overview

## 39.1 Main Entities

- User
- Player
- World
- Island
- City
- Building
- ResourceBalance
- ResourceTransaction
- Research
- Technology
- Unit
- Army
- Fleet
- Movement
- Battle
- TradeOffer
- TradeRoute
- Alliance
- AllianceMember
- Message
- Report
- Quest
- Achievement
- Event
- DonationRecord
- AdminAction
- AuditLog

---

## 39.2 Example Entity: City

Fields:

- id
- world_id
- player_id
- island_id
- name
- level
- population
- happiness
- corruption
- created_at
- updated_at

---

## 39.3 Example Entity: ResourceBalance

Fields:

- id
- city_id
- wood
- marble
- wine
- crystal
- sulfur
- gold
- updated_at

---

## 39.4 Example Entity: Building

Fields:

- id
- city_id
- building_type
- level
- slot_index
- upgrade_started_at
- upgrade_finishes_at
- status

---

## 39.5 Example Entity: Movement

Fields:

- id
- world_id
- origin_city_id
- destination_city_id
- movement_type
- units
- resources
- departure_time
- arrival_time
- return_time
- status

---

# 40. Economy Balancing

## 40.1 Balance Sheets Needed

The PM needs spreadsheets for:

- Building costs
- Building times
- Resource production
- Warehouse capacity
- Research costs
- Research times
- Unit costs
- Unit training times
- Unit upkeep
- Ship capacity
- Travel times
- Loot limits
- Quest rewards
- Event rewards
- Supporter cosmetic limits

---

## 40.2 Progression Timing

Recommended early game:

- First action: instant or under 1 minute
- First building upgrade: 1 to 5 minutes
- First research: 5 to 15 minutes
- First trade: within first session
- First PvE fight: first session
- First colony: within first few days

Recommended mid game:

- Building upgrades: hours
- Research: hours to 1 day
- Expansion: several days
- Alliance projects: days

Recommended late game:

- Building upgrades: days
- Research: days
- Large projects: weeks

---

## 40.3 Resource Sink Examples

To avoid inflation:

- Building upgrades
- Research
- Unit upkeep
- Ship construction
- Alliance projects
- Wonders
- Events
- Marketplace taxes
- City expansion
- Cultural festivals

---

# 41. MVP Scope

## 41.1 MVP Goal

Prove that players enjoy logging in every day to grow their island empire through building, resources, research, trade, and cooperation.

---

## 41.2 MVP Must Include

- Account creation
- Login
- One world/server
- City view
- Building upgrades
- Construction timers
- Resource production
- Worker assignment
- Warehouse
- Research tree v1
- World map
- Islands
- Multiple cities
- Colonization
- Transport ships
- Internal resource transport
- Basic marketplace
- Basic PvE
- Basic military
- Battle reports
- Player messaging
- Alliance creation/joining
- Rankings
- Tutorial quests
- Notifications
- Admin dashboard
- Basic anti-cheat

---

## 41.3 MVP Should Not Include

- Complex wonders
- Complex alliance territory control
- Advanced naval formations
- Too many unit types
- Mobile native app
- Complex hero system
- Season pass
- Heavy animations
- Full real-time battles
- Huge cosmetics system
- Too many resources
- Complex politics system

---

# 42. Roadmap

## 42.1 Phase 1 — Prototype

Goal:

Validate the city/resource/timer loop.

Build:

- City view
- Resources
- Buildings
- Upgrade timers
- Simple research
- Basic UI
- Local test world

Success metric:

- Player starts an upgrade and wants to return later.

---

## 42.2 Phase 2 — Closed Alpha

Goal:

Validate multiplayer economy.

Build:

- World map
- Islands
- Multiple cities
- Resource transport
- Marketplace
- Messaging
- Alliances v1
- PvE camps
- Admin tools

Success metric:

- Players trade, communicate, and join alliances.

---

## 42.3 Phase 3 — Beta

Goal:

Validate retention and balance.

Build:

- Combat v1
- Naval v1
- Rankings
- Events
- Better onboarding
- Anti-cheat
- Payment test
- Analytics dashboards

Success metric:

- Healthy D7 and D30 retention.

---

## 42.4 Phase 4 — Public Launch

Goal:

Launch a stable live world.

Build:

- Production infrastructure
- Live operations
- Support project
- Moderation tools
- Support process
- Monitoring
- Global announcements
- Full analytics

Success metric:

- Stable servers, active alliances, healthy economy.

---

## 42.5 Phase 5 — Expansion

Add:

- World wonders
- Alliance missions
- More research branches
- More city skins
- Seasonal worlds
- Advanced diplomacy
- World merge system
- Mobile PWA
- Advanced PvE
- Alliance monuments

---

# 43. Feature Priority

## 43.1 P0 — Critical

- Login
- World creation
- City system
- Resource system
- Building upgrades
- Timers
- Research
- Map
- Transport
- Second city
- Tutorial
- Admin tools

---

## 43.2 P1 — Important

- Alliances
- Marketplace
- PvE
- Basic combat
- Rankings
- Reports
- Notifications
- Anti-cheat

---

## 43.3 P2 — Later

- Support project page
- Events
- Advanced diplomacy
- World wonders
- Cosmetics
- Seasonal servers
- Mobile app

---

# 44. User Stories

## 44.1 City Building

### User Story

As a player, I want to upgrade buildings so that my city becomes stronger over time.

### Acceptance Criteria

- Player can see available buildings
- Player can see upgrade cost
- Player can see upgrade duration
- Player can start an upgrade if requirements are met
- Resources are deducted when upgrade starts
- Timer starts correctly
- Building level increases when timer completes
- Player receives notification when upgrade completes

---

## 44.2 Resource Production

### User Story

As a player, I want my city to produce resources over time so that I can upgrade buildings and grow my empire.

### Acceptance Criteria

- Resources increase over time
- Production depends on assigned workers
- Production is capped by storage
- Player sees hourly production
- Player receives warning when storage is full

---

## 44.3 Research

### User Story

As a player, I want to research technologies so that I can unlock new buildings, units, and bonuses.

### Acceptance Criteria

- Player can open research screen
- Player can see available technologies
- Player can see requirements
- Player can start research
- Research points are consumed or progress is tracked
- Technology unlocks when complete
- Player receives notification

---

## 44.4 Trade

### User Story

As a player, I want to trade resources with other players so that I can obtain resources my island does not produce.

### Acceptance Criteria

- Player can create trade offer
- Other players can see offer
- Player can accept offer
- Trade ships are assigned
- Resources are transferred after travel time
- Trade report is generated

---

## 44.5 Alliance

### User Story

As a player, I want to join an alliance so that I can cooperate with other players.

### Acceptance Criteria

- Player can search alliances
- Player can apply to alliance
- Alliance officer can accept or reject
- Player can see alliance members
- Player can access alliance chat
- Player can contribute to alliance projects

---

## 44.6 PvE Combat

### User Story

As a player, I want to attack PvE camps so that I can learn combat and earn rewards without attacking real players.

### Acceptance Criteria

- Player can find PvE camp on map
- Player can send units
- Battle resolves automatically
- Battle report is generated
- Rewards are delivered if player wins
- Units return after battle

---

## 44.7 PvP Combat

### User Story

As a player, I want to attack another city so that I can compete strategically with other players.

### Acceptance Criteria

- Player can scout target
- Player can send units
- Travel time is calculated
- Beginner protection is respected
- Battle resolves automatically
- Loot is capped
- Battle report is generated
- Surviving units return

---

# 45. Analytics Plan

## 45.1 Acquisition Metrics

- Landing page conversion
- Registration conversion
- World selection rate
- Tutorial start rate

---

## 45.2 Activation Metrics

- First building started
- First building completed
- First research started
- First resource assignment
- First map view
- First trade sent
- First PvE fight
- First alliance joined

---

## 45.3 Retention Metrics

- D1 retention
- D3 retention
- D7 retention
- D30 retention
- Sessions per day
- Average session duration
- Return after attack
- Return after resource shortage
- Return after alliance invite

---

## 45.4 Economy Metrics

- Resource generated per day
- Resource spent per day
- Warehouse overflow rate
- Idle construction queue time
- Idle research queue time
- Trade volume
- Marketplace liquidity
- Average city expansion time

---

## 45.5 Social Metrics

- Alliance join rate
- Messages sent per player
- Trade between players
- Alliance donations
- Alliance project participation
- Alliance retention vs solo retention

---

## 45.6 Donation and Trust Metrics

- Donation conversion
- Average donation amount
- Support project page visits
- Supporter cosmetic usage
- Refund rate
- Pay-to-win complaints

---

## 45.7 Safety and Health Metrics

- Reports per 1,000 players
- Harassment reports
- Multi-account flags
- Bot flags
- Ban appeals
- New player attack rate
- Players quitting after attacks

---

# 46. Main Product Risks

## 46.1 Risk: Early Game Is Too Slow

Problem:

Players leave before understanding the fun.

Solutions:

- Fast first upgrades
- Guided tutorial
- Clear next goals
- Early rewards
- Early PvE
- First research quickly visible

---

## 46.2 Risk: PvP Is Too Aggressive

Problem:

Casual players quit after being attacked repeatedly.

Solutions:

- Beginner protection
- Loot caps
- Attack cooldowns
- Warehouse protection
- PvE alternatives
- Anti-bullying rules

---

## 46.3 Risk: Pay-to-Win Perception

Problem:

Players believe paying users always win.

Solutions:

- Sell cosmetics and convenience
- Limit speedups
- Avoid exclusive powerful units
- Publish fair monetization policy
- Monitor complaints

---

## 46.4 Risk: Economy Inflation

Problem:

Too many resources enter the game.

Solutions:

- Building costs
- Research costs
- Unit upkeep
- Alliance projects
- Marketplace tax
- Events with resource sinks

---

## 46.5 Risk: Old Worlds Become Dead

Problem:

New players avoid old servers and old players leave.

Solutions:

- World merge
- Catch-up bonuses
- New player regions
- Returner rewards
- Seasonal worlds

---

## 46.6 Risk: Botting

Problem:

Players automate actions and damage fairness.

Solutions:

- Server-side validation
- Rate limits
- Suspicious activity detection
- Trade audits
- Anti-bot behavior analysis

---

# 47. PM Documents to Prepare

The Product Manager should prepare:

- Product vision document
- Market/competitor benchmark
- MVP scope document
- User personas
- Core gameplay loop document
- Feature backlog
- User stories
- Acceptance criteria
- Economy balancing spreadsheet
- Building cost spreadsheet
- Research cost spreadsheet
- Unit balancing spreadsheet
- World map design rules
- Donation and anti-pay-to-win policy
- Anti-pay-to-win policy
- Moderation policy
- Analytics tracking plan
- Live-ops calendar
- Technical architecture brief
- UX wireframes
- Admin requirements
- Risk matrix
- Roadmap

---

# 48. Recommended MVP Definition

## 48.1 MVP Statement

The MVP should prove that players enjoy logging in every day to manage their island city, grow their economy, research technologies, trade resources, and cooperate with other players.

---

## 48.2 MVP Success Criteria

The MVP is successful if:

- Players return after the first day
- Players understand the city loop
- Players start research
- Players send trade ships
- Players join alliances
- Players expand to a second city
- Players continue playing after waiting for timers
- Players do not feel forced to stay online all day

---

## 48.3 MVP Core Loop

1. Produce resources
2. Upgrade buildings
3. Research technologies
4. Trade missing resources
5. Expand to another island
6. Join alliance
7. Cooperate with others
8. Return daily for progress

---

# 49. Final Product Direction

The recommended direction is:

> A calm island empire builder where trade, alliances, and smart planning matter more than constant war.

The game should be built around:

- Low-pressure progression
- Meaningful daily login
- Long-term city growth
- Resource specialization
- Trade economy
- Research progression
- Alliance cooperation
- Optional PvP
- Strong PvE
- Fair monetization
- Browser-first accessibility

The first version should not try to build every advanced system.

The first version should prove the core question:

> Can players enjoy logging in every day to grow their island empire, trade resources, research technologies, and cooperate with other players?

If the answer is yes, the game can expand with deeper combat, alliance projects, world wonders, seasonal events, advanced diplomacy, and long-term live operations.

---
