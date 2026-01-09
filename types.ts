
export interface Player {
  id: string;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  slogan: string;
  players: Player[];
}

export interface GeneratorConfig {
  playersPerTeam: number;
  numberOfTeams: number;
}
