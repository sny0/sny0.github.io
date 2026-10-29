using System;

namespace Sny0.Study.Shooter
{
    // Pixel coordinates: origin at the top-left, positive Y points down.
    public readonly struct ShooterInput
    {
        public float MoveX { get; }
        public float MoveY { get; }
        public bool Shoot { get; }
        public bool Restart { get; }

        public ShooterInput(float moveX, float moveY, bool shoot, bool restart)
        {
            MoveX = moveX;
            MoveY = moveY;
            Shoot = shoot;
            Restart = restart;
        }
    }

    // A value copy for a view. No writable reference into the model is exposed.
    public readonly struct ShooterActor
    {
        public float X { get; }
        public float Y { get; }
        public float Radius { get; }

        public ShooterActor(float x, float y, float radius)
        {
            X = x;
            Y = y;
            Radius = radius;
        }
    }

    public sealed class ShooterModel
    {
        public const float Width = 640f;
        public const float Height = 720f;
        public const float TickSeconds = 1f / 60f;
        public const float PlayerRadius = 18f;
        public const float BulletRadius = 5f;
        public const float EnemyRadius = 16f;
        public const int MaxBullets = 64;
        public const int MaxEnemies = 32;

        private const float PlayerSpeed = 280f;
        private const float BulletSpeed = -520f;
        private const float EnemySpeed = 110f;
        private const int ShotIntervalTicks = 9;       // 0.15 seconds
        private const int SpawnIntervalTicks = 39;     // 0.65 seconds
        private const int InvulnerabilityTicks = 48;   // 0.8 seconds
        private static readonly float[] SpawnX = { 64f, 160f, 256f, 352f, 448f, 544f };

        private struct Actor
        {
            public float X;
            public float Y;
            public bool Alive;

            public Actor(float x, float y)
            {
                X = x;
                Y = y;
                Alive = true;
            }
        }

        private readonly Actor[] _bullets = new Actor[MaxBullets];
        private readonly Actor[] _enemies = new Actor[MaxEnemies];
        private int _bulletCount;
        private int _enemyCount;
        private int _shotCooldown;
        private int _spawnCountdown;
        private int _invulnerability;
        private int _nextSpawnX;

        public float PlayerX { get; private set; }
        public float PlayerY { get; private set; }
        public int HP { get; private set; }
        public int Score { get; private set; }
        public bool GameOver { get; private set; }
        public int ElapsedTicks { get; private set; }
        public bool Invulnerable { get { return _invulnerability > 0; } }
        public int BulletCount { get { return _bulletCount; } }
        public int EnemyCount { get { return _enemyCount; } }

        public ShooterModel()
        {
            Reset();
        }

        public void Reset()
        {
            PlayerX = 320f;
            PlayerY = 650f;
            HP = 3;
            Score = 0;
            GameOver = false;
            ElapsedTicks = 0;
            _bulletCount = 0;
            _enemyCount = 0;
            _shotCooldown = 0; // The first held shot can fire immediately.
            _spawnCountdown = SpawnIntervalTicks;
            _invulnerability = 0;
            _nextSpawnX = 0;
            Array.Clear(_bullets, 0, _bullets.Length);
            Array.Clear(_enemies, 0, _enemies.Length);
        }

        public ShooterActor GetBullet(int index)
        {
            if (index < 0 || index >= _bulletCount)
                throw new ArgumentOutOfRangeException(nameof(index));
            Actor actor = _bullets[index];
            return new ShooterActor(actor.X, actor.Y, BulletRadius);
        }

        public ShooterActor GetEnemy(int index)
        {
            if (index < 0 || index >= _enemyCount)
                throw new ArgumentOutOfRangeException(nameof(index));
            Actor actor = _enemies[index];
            return new ShooterActor(actor.X, actor.Y, EnemyRadius);
        }

        // Exactly one simulation tick. The adapter owns elapsed real time.
        public void Tick(ShooterInput input)
        {
            if (input.Restart)
            {
                Reset();
                return;
            }
            if (GameOver)
                return;

            ElapsedTicks++;
            if (_shotCooldown > 0) _shotCooldown--;
            if (_invulnerability > 0) _invulnerability--;

            float dx = input.MoveX;
            float dy = input.MoveY;
            float length = (float)Math.Sqrt(dx * dx + dy * dy);
            if (length > 0f)
            {
                dx /= length;
                dy /= length;
            }
            PlayerX = Clamp(PlayerX + dx * PlayerSpeed * TickSeconds,
                PlayerRadius, Width - PlayerRadius);
            PlayerY = Clamp(PlayerY + dy * PlayerSpeed * TickSeconds,
                PlayerRadius, Height - PlayerRadius);

            if (input.Shoot && _shotCooldown == 0)
            {
                if (_bulletCount < MaxBullets)
                    _bullets[_bulletCount++] = new Actor(PlayerX, PlayerY - 24f);
                _shotCooldown = ShotIntervalTicks; // A full pool still consumes the attempt.
            }

            _spawnCountdown--;
            if (_spawnCountdown == 0)
            {
                float x = SpawnX[_nextSpawnX];
                _nextSpawnX = (_nextSpawnX + 1) % SpawnX.Length;
                if (_enemyCount < MaxEnemies)
                    _enemies[_enemyCount++] = new Actor(x, -EnemyRadius);
                _spawnCountdown = SpawnIntervalTicks;
            }

            // New actors move in their creation tick, too.
            for (int i = 0; i < _bulletCount; i++)
                _bullets[i].Y += BulletSpeed * TickSeconds;
            for (int i = 0; i < _enemyCount; i++)
                _enemies[i].Y += EnemySpeed * TickSeconds;

            // Mark first. Do not remove from either collection while walking it.
            for (int b = 0; b < _bulletCount; b++)
            {
                if (!_bullets[b].Alive) continue;
                for (int e = 0; e < _enemyCount; e++)
                {
                    if (!_enemies[e].Alive) continue;
                    if (!Overlap(_bullets[b].X, _bullets[b].Y, BulletRadius,
                        _enemies[e].X, _enemies[e].Y, EnemyRadius)) continue;
                    _bullets[b].Alive = false;
                    _enemies[e].Alive = false;
                    Score += 100;
                    break; // One bullet cannot hit a second enemy.
                }
            }

            for (int e = 0; e < _enemyCount; e++)
            {
                if (!_enemies[e].Alive) continue;
                if (!Overlap(PlayerX, PlayerY, PlayerRadius,
                    _enemies[e].X, _enemies[e].Y, EnemyRadius)) continue;
                _enemies[e].Alive = false;
                if (_invulnerability == 0)
                {
                    HP--;
                    _invulnerability = InvulnerabilityTicks;
                    if (HP == 0) GameOver = true;
                }
            }

            for (int b = 0; b < _bulletCount; b++)
                if (_bullets[b].Y + BulletRadius < 0f) _bullets[b].Alive = false;
            for (int e = 0; e < _enemyCount; e++)
                if (_enemies[e].Y - EnemyRadius > Height) _enemies[e].Alive = false;

            Compact(_bullets, ref _bulletCount);
            Compact(_enemies, ref _enemyCount);
        }

        private static bool Overlap(float ax, float ay, float ar, float bx, float by, float br)
        {
            float dx = ax - bx;
            float dy = ay - by;
            float radius = ar + br;
            return dx * dx + dy * dy <= radius * radius;
        }

        private static float Clamp(float value, float min, float max)
        {
            return Math.Max(min, Math.Min(max, value));
        }

        private static void Compact(Actor[] actors, ref int count)
        {
            int write = 0;
            for (int read = 0; read < count; read++)
                if (actors[read].Alive) actors[write++] = actors[read];
            for (int i = write; i < count; i++) actors[i] = default(Actor);
            count = write;
        }
    }
}
