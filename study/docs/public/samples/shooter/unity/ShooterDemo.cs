using UnityEngine;
using UnityEngine.Rendering;
using Sny0.Study.Shooter;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

// Unity 6.0 (6000.0), 2D Built-In Render Pipeline demo.
// Attach to one empty GameObject in a new scene; no prefab/image/Physics2D is used.
[DisallowMultipleComponent]
public sealed class ShooterDemo : MonoBehaviour
{
    private const double FixedStep = 1.0 / 60.0;
    private const int MaxTicksPerFrame = 5;
    private const float PixelsPerUnit = 100f;
    private const string Controls = "WASD / Arrows: Move    Space: Fire    R: Restart";

    private ShooterModel _model;
    private double _accumulator;
    private bool _restartPending;
    private GameObject _viewRoot;
    private Camera _camera;
    private Texture2D _circleTexture;
    private Sprite _circleSprite;
    private SpriteRenderer _playerView;
    private SpriteRenderer[] _bulletViews;
    private SpriteRenderer[] _enemyViews;
    private GUIStyle _hudStyle;
    private GUIStyle _helpStyle;
    private GUIStyle _gameOverStyle;
    private GUIStyle _panelStyle;
    private string _hudText = "";
    private int _shownScore = -1;
    private int _shownHP = -1;
    private bool _keyboardAvailable = true;

    private void Awake()
    {
        if (GraphicsSettings.currentRenderPipeline != null)
        {
            Debug.LogError("ShooterDemo targets a 2D Built-In Render Pipeline scene. See README for URP conditions.", this);
            enabled = false;
            return;
        }

        _model = new ShooterModel();
        _viewRoot = new GameObject("ShooterDemo - owned views");
        _viewRoot.transform.SetParent(transform, false);
        CreateCircleSprite();

        GameObject cameraObject = new GameObject("ShooterDemo Camera");
        cameraObject.transform.SetParent(_viewRoot.transform, false);
        cameraObject.transform.position = new Vector3(0f, 0f, -10f);
        _camera = cameraObject.AddComponent<Camera>();
        _camera.orthographic = true;
        _camera.clearFlags = CameraClearFlags.SolidColor;
        _camera.backgroundColor = new Color(0.055f, 0.085f, 0.075f);
        _camera.nearClipPlane = 0.1f;
        _camera.farClipPlane = 50f;
        _camera.depth = 10f; // Leave existing scene cameras alive and unchanged.

        _playerView = CreateView("Player", ShooterModel.PlayerRadius,
            new Color(0.38f, 0.88f, 0.65f), 2);
        _bulletViews = CreatePool("Bullet", ShooterModel.MaxBullets, ShooterModel.BulletRadius,
            new Color(1f, 0.91f, 0.54f), 1);
        _enemyViews = CreatePool("Enemy", ShooterModel.MaxEnemies, ShooterModel.EnemyRadius,
            new Color(0.95f, 0.40f, 0.32f), 0);
        FitCamera();
        SynchronizeViews();
        UpdateHudText();
    }

    private void OnEnable()
    {
        _accumulator = 0.0;
        _restartPending = false;
        if (_viewRoot != null) _viewRoot.SetActive(true);
    }

    private void OnDisable()
    {
        _accumulator = 0.0;
        _restartPending = false;
        if (_viewRoot != null) _viewRoot.SetActive(false);
    }

    private void Update()
    {
        if (_model == null) return;
        ShooterInput frameInput = ReadInput();
        _restartPending |= frameInput.Restart; // Preserve an edge until one tick consumes it.
        _accumulator += System.Math.Min((double)Time.deltaTime, 0.1);

        int ticks = 0;
        while (_accumulator >= FixedStep && ticks < MaxTicksPerFrame)
        {
            ShooterInput tickInput = new ShooterInput(frameInput.MoveX, frameInput.MoveY,
                frameInput.Shoot, _restartPending);
            _restartPending = false;
            _model.Tick(tickInput);
            _accumulator -= FixedStep;
            ticks++;
        }
        if (_accumulator >= FixedStep)
            _accumulator %= FixedStep; // Discard every remaining whole tick, keep the fraction.

        FitCamera();
        SynchronizeViews();
        UpdateHudText();
    }

    private ShooterInput ReadInput()
    {
#if ENABLE_INPUT_SYSTEM
        Keyboard keyboard = Keyboard.current;
        _keyboardAvailable = keyboard != null;
        if (keyboard == null) return new ShooterInput(0f, 0f, false, false);
        float x = (keyboard.rightArrowKey.isPressed || keyboard.dKey.isPressed ? 1f : 0f)
            - (keyboard.leftArrowKey.isPressed || keyboard.aKey.isPressed ? 1f : 0f);
        float y = (keyboard.downArrowKey.isPressed || keyboard.sKey.isPressed ? 1f : 0f)
            - (keyboard.upArrowKey.isPressed || keyboard.wKey.isPressed ? 1f : 0f);
        return new ShooterInput(x, y, keyboard.spaceKey.isPressed, keyboard.rKey.wasPressedThisFrame);
#elif ENABLE_LEGACY_INPUT_MANAGER
        _keyboardAvailable = true;
        float x = (Input.GetKey(KeyCode.RightArrow) || Input.GetKey(KeyCode.D) ? 1f : 0f)
            - (Input.GetKey(KeyCode.LeftArrow) || Input.GetKey(KeyCode.A) ? 1f : 0f);
        float y = (Input.GetKey(KeyCode.DownArrow) || Input.GetKey(KeyCode.S) ? 1f : 0f)
            - (Input.GetKey(KeyCode.UpArrow) || Input.GetKey(KeyCode.W) ? 1f : 0f);
        return new ShooterInput(x, y, Input.GetKey(KeyCode.Space), Input.GetKeyDown(KeyCode.R));
#else
        _keyboardAvailable = false;
        return new ShooterInput(0f, 0f, false, false);
#endif
    }

    private void CreateCircleSprite()
    {
        const int size = 64;
        _circleTexture = new Texture2D(size, size, TextureFormat.RGBA32, false);
        _circleTexture.name = "ShooterDemo Circle Texture";
        _circleTexture.filterMode = FilterMode.Bilinear;
        _circleTexture.wrapMode = TextureWrapMode.Clamp;
        Color32[] pixels = new Color32[size * size];
        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                float dx = x + 0.5f - size * 0.5f;
                float dy = y + 0.5f - size * 0.5f;
                byte alpha = (byte)(255f * Mathf.Clamp01(size * 0.5f - 0.5f - Mathf.Sqrt(dx * dx + dy * dy)));
                pixels[y * size + x] = new Color32(255, 255, 255, alpha);
            }
        }
        _circleTexture.SetPixels32(pixels);
        _circleTexture.Apply(false, true);
        // A sprite diameter of one Unity unit; individual views apply their radius scale.
        _circleSprite = Sprite.Create(_circleTexture, new Rect(0, 0, size, size),
            new Vector2(0.5f, 0.5f), size, 0, SpriteMeshType.FullRect);
        _circleSprite.name = "ShooterDemo Shared Circle";
    }

    private SpriteRenderer CreateView(string label, float radius, Color color, int order)
    {
        GameObject actor = new GameObject(label);
        actor.transform.SetParent(_viewRoot.transform, false);
        actor.transform.localScale = Vector3.one * (2f * radius / PixelsPerUnit);
        SpriteRenderer renderer = actor.AddComponent<SpriteRenderer>();
        renderer.sprite = _circleSprite;
        renderer.color = color;
        renderer.sortingOrder = order;
        renderer.enabled = false;
        return renderer;
    }

    private SpriteRenderer[] CreatePool(string label, int count, float radius, Color color, int order)
    {
        SpriteRenderer[] pool = new SpriteRenderer[count];
        for (int i = 0; i < count; i++)
            pool[i] = CreateView(label + " " + i, radius, color, order);
        return pool;
    }

    private static Vector3 PixelToWorld(float x, float y)
    {
        return new Vector3((x - ShooterModel.Width * 0.5f) / PixelsPerUnit,
            (ShooterModel.Height * 0.5f - y) / PixelsPerUnit, 0f);
    }

    private void FitCamera()
    {
        float aspect = Screen.width / (float)Mathf.Max(1, Screen.height);
        _camera.orthographicSize = Mathf.Max(ShooterModel.Height * 0.5f,
            ShooterModel.Width * 0.5f / aspect) / PixelsPerUnit;
    }

    private void SynchronizeViews()
    {
        _playerView.enabled = true;
        _playerView.transform.position = PixelToWorld(_model.PlayerX, _model.PlayerY);
        _playerView.color = _model.Invulnerable
            ? new Color(0.76f, 1f, 0.89f) : new Color(0.38f, 0.88f, 0.65f);
        for (int i = 0; i < _bulletViews.Length; i++)
        {
            _bulletViews[i].enabled = i < _model.BulletCount;
            if (i < _model.BulletCount)
            {
                ShooterActor bullet = _model.GetBullet(i);
                _bulletViews[i].transform.position = PixelToWorld(bullet.X, bullet.Y);
            }
        }
        for (int i = 0; i < _enemyViews.Length; i++)
        {
            _enemyViews[i].enabled = i < _model.EnemyCount;
            if (i < _model.EnemyCount)
            {
                ShooterActor enemy = _model.GetEnemy(i);
                _enemyViews[i].transform.position = PixelToWorld(enemy.X, enemy.Y);
            }
        }
    }

    private void UpdateHudText()
    {
        if (_shownScore == _model.Score && _shownHP == _model.HP) return;
        _shownScore = _model.Score;
        _shownHP = _model.HP;
        _hudText = "Score: " + _shownScore + "    HP: " + _shownHP;
    }

    private void OnGUI()
    {
        if (_model == null) return;
        // GUI.skin is read only in OnGUI; styles are created once, not per event.
        if (_hudStyle == null)
        {
            _hudStyle = new GUIStyle(GUI.skin.label) { fontSize = 22 };
            _hudStyle.normal.textColor = Color.white;
            _helpStyle = new GUIStyle(_hudStyle) { fontSize = 16 };
            _gameOverStyle = new GUIStyle(_hudStyle)
                { fontSize = 38, alignment = TextAnchor.MiddleCenter };
            _panelStyle = new GUIStyle(GUI.skin.box);
        }
        float scale = Mathf.Min(Screen.width / ShooterModel.Width, Screen.height / ShooterModel.Height);
        if (scale <= 0f) return;
        float x = (Screen.width - ShooterModel.Width * scale) * 0.5f;
        float y = (Screen.height - ShooterModel.Height * scale) * 0.5f;
        Matrix4x4 previous = GUI.matrix;
        try
        {
            GUI.matrix = Matrix4x4.TRS(new Vector3(x, y, 0f), Quaternion.identity,
                new Vector3(scale, scale, 1f));
            GUI.Label(new Rect(12, 8, 600, 32), _hudText, _hudStyle);
            GUI.Label(new Rect(12, 690, 620, 25), Controls, _helpStyle);
            if (!_keyboardAvailable)
                GUI.Label(new Rect(12, 40, 620, 28), "Keyboard unavailable. Check Active Input Handling and Game view focus.", _helpStyle);
            if (_model.GameOver)
            {
                GUI.Box(new Rect(100, 275, 440, 140), GUIContent.none, _panelStyle);
                GUI.Label(new Rect(100, 285, 440, 64), "GAME OVER", _gameOverStyle);
                GUI.Label(new Rect(220, 365, 260, 30), "Press R to restart", _helpStyle);
            }
        }
        finally
        {
            GUI.matrix = previous;
        }
    }

    private void OnDestroy()
    {
        // Only resources created here are destroyed. Existing cameras/materials are not owned.
        if (_viewRoot != null) Destroy(_viewRoot);
        if (_circleSprite != null) Destroy(_circleSprite);
        if (_circleTexture != null) Destroy(_circleTexture);
    }
}
