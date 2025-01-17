import Area from '../../map/areas/area';
import Minigame from '../minigame';

import Utils from '@kaetram/common/util/utils';
import { Team } from '@kaetram/common/api/minigame';
import { Modules, Opcodes } from '@kaetram/common/network';

import type Player from '../../entity/character/player/player';
import type World from '../../world';

export default class TeamWar extends Minigame {
    private countdown: number = Modules.MinigameConstants.TEAM_WAR_COUNTDOWN;

    // Areas for the minigame.
    private redSpawn: Area = new Area(0, 0, 0, 0, 0); // Spawn area for red team.
    private blueSpawn: Area = new Area(0, 0, 0, 0, 0); // Spawn area for blue team.

    private redTeamKills = 0;
    private blueTeamKills = 0;

    public constructor(world: World) {
        super(world, Opcodes.Minigame.TeamWar);

        // Begin the tick interval for the minigame.
        setInterval(this.tick.bind(this), 1000);
    }

    /**
     * Loads a map area into the TeamWar minigame. We use this to load
     * the lobby area and begin working with it.
     * @param area Area object received from the map.
     */

    public override loadArea(area: Area): void {
        super.loadArea(area);

        switch (area.mObjectType) {
            case 'redteamspawn': {
                this.redSpawn = area;
                return;
            }

            case 'blueteamspawn': {
                this.blueSpawn = area;
                return;
            }
        }
    }

    /**
     * Handles the point distribution for when a player kills another player.
     * @param player The player who has killed the other player. This is the player
     * whose team we are awarding points to.
     */

    public override kill(player: Player): void {
        if (player.team === Team.Blue) this.blueTeamKills++;
        else if (player.team === Team.Red) this.redTeamKills++;
    }

    /**
     * Finds a random point within the red or blue team depending on the team paramaeter.
     * @params team The team we are grabbing the respawn point for.
     * @returns Returns a respawn point within the minigame area depending on the team.
     */

    public override getRespawnPoint(team: Team): Position {
        if (!this.started) return this.getLobbyPosition();

        let area = team === Team.Red ? this.redSpawn : this.blueSpawn;

        return {
            x: Utils.randomInt(area.x + 1, area.x + area.width - 1),
            y: Utils.randomInt(area.y + 1, area.y + area.height - 1)
        };
    }

    /**
     * Function called every 1 second interval that handles the minigame logic.
     */

    private tick(): void {
        if (this.countdown <= 0) {
            this.countdown = Modules.MinigameConstants.TEAM_WAR_COUNTDOWN;

            // Attempt to start if not started, otherwise end the game.
            if (this.started) this.stop();
            else this.start();

            return;
        }

        this.countdown--;

        // Send the score packet to the players in-game.
        if (this.playersInGame.length > 0)
            this.sendPacket(this.playersInGame, {
                action: Opcodes.TeamWar.Score,
                countdown: this.countdown,
                redTeamKills: this.redTeamKills,
                blueTeamKills: this.blueTeamKills
            });

        // Send the countdown packet to the players in the lobby.
        if (this.playersInLobby.length > 0)
            this.sendPacket(this.playersInLobby, {
                action: Opcodes.TeamWar.Lobby,
                countdown: this.countdown,
                started: this.started
            });
    }

    /**
     * Shuffles the players in the lobby.
     * @returns Returns the shuffled players in the lobby.
     */

    private shuffleLobby(): Player[] {
        let lobby = this.playersInLobby;

        for (let x = lobby.length - 1; x > 0; x--) {
            let y = Math.floor(Math.random() * x),
                temp = lobby[x];

            lobby[x] = lobby[y];
            lobby[y] = temp;
        }

        return lobby;
    }

    /**
     * Finds all the players in the lobby and splits them into two teams,
     * then we send packets to both teams to assign teams.
     */

    private start(): void {
        let redTeam = this.shuffleLobby();

        // Not enough players, we're not starting the game.
        if (redTeam.length < Modules.MinigameConstants.TEAM_WAR_MIN_PLAYERS) {
            // Notify all players there aren't enough players in the lobby.
            for (let player of redTeam)
                player.notify(
                    `There must be at least ${Modules.MinigameConstants.TEAM_WAR_MIN_PLAYERS} players to start the game.`
                );

            return;
        }

        this.started = true;

        let blueTeam = redTeam.splice(0, redTeam.length / 2);

        // Assign each player in each team their respective team.
        for (let player of redTeam) player.team = Team.Red;
        for (let player of blueTeam) player.team = Team.Blue;

        // Concatenate all the players into one array for later.
        this.playersInGame = [...redTeam, ...blueTeam];

        // Teleport every player to the lobby.
        for (let player of this.playersInGame) {
            player.minigame = Opcodes.Minigame.TeamWar;

            let position = this.getRespawnPoint(player.team!);

            player.teleport(position.x, position.y, false, true);
        }
    }

    /**
     * Stops the game and handles all the packets and cleanups.
     */

    public override stop(): void {
        this.sendPacket(this.playersInGame, {
            action: Opcodes.TeamWar.End
        });

        super.stop();

        this.redTeamKills = 0;
        this.blueTeamKills = 0;
    }
}
