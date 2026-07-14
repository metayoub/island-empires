import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envConfig } from './config/env';
import { PrismaModule } from './database/prisma.module';
import { AccountModule } from './modules/account/account.module';
import { AdvancedSearchModule } from './modules/advanced-search/advanced-search.module';
import { AdminModule } from './modules/admin/admin.module';
import { AlliancesModule } from './modules/alliances/alliances.module';
import { AntiAbuseModule } from './modules/anti-abuse/anti-abuse.module';
import { AuthModule } from './modules/auth/auth.module';
import { BarracksModule } from './modules/barracks/barracks.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { CitiesModule } from './modules/cities/cities.module';
import { DebugModule } from './modules/debug/debug.module';
import { PveModule } from './modules/pve/pve.module';
import { PvpModule } from './modules/pvp/pvp.module';
import { GuideModule } from './modules/guide/guide.module';
import { HealthModule } from './modules/health/health.module';
import { SupportModule } from './modules/support/support.module';
import { VersionModule } from './modules/version/version.module';
import { MapModule } from './modules/map/map.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { MessagesModule } from './modules/messages/messages.module';
import { LiveEventsModule } from './modules/live-events/live-events.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SupporterProjectModule } from './modules/supporter/supporter.module';
import { MovementsModule } from './modules/movements/movements.module';
import { NavalModule } from './modules/naval/naval.module';
import { PlayersModule } from './modules/players/players.module';
import { QuestsModule } from './modules/quests/quests.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RankingsModule } from './modules/rankings/rankings.module';
import { ResearchModule } from './modules/research/research.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ScoutingModule } from './modules/scouting/scouting.module';
import { WorkersModule } from './modules/workers/workers.module';
import { WorldsModule } from './modules/worlds/worlds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      load: [envConfig],
    }),
    PrismaModule,
    HealthModule,
    VersionModule,
    SupportModule,
    AntiAbuseModule,
    AuthModule,
    AdminModule,
    AccountModule,
    AdvancedSearchModule,
    AlliancesModule,
    PlayersModule,
    WorldsModule,
    CitiesModule,
    DebugModule,
    BuildingsModule,
    ResourcesModule,
    WorkersModule,
    ReportsModule,
    RankingsModule,
    ResearchModule,
    QuestsModule,
    GuideModule,
    MapModule,
    MarketplaceModule,
    MessagesModule,
    LiveEventsModule,
    InventoryModule,
    SupporterProjectModule,
    MovementsModule,
    BarracksModule,
    PveModule,
    PvpModule,
    NavalModule,
    ScoutingModule,
  ],
})
export class AppModule {}
