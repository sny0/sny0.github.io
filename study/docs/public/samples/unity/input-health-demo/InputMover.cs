using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Rigidbody2D))]
public sealed class InputMover : MonoBehaviour
{
    [SerializeField] private InputActionReference move;
    [SerializeField, Min(0f)] private float speed = 2f;

    private Rigidbody2D body;
    private InputAction moveAction;
    private Vector2 direction;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
    }

    private void OnEnable()
    {
        if (move == null || move.action == null)
        {
            Debug.LogError("Assign HealthControls / Player / Move to Input Mover.", this);
            enabled = false;
            return;
        }

        moveAction = move.action.Clone();
        moveAction.Enable();
    }

    private void Update()
    {
        direction = Vector2.ClampMagnitude(moveAction.ReadValue<Vector2>(), 1f);
    }

    private void FixedUpdate()
    {
        Vector2 displacement = direction * speed * Time.fixedDeltaTime;
        body.MovePosition(body.position + displacement);
    }

    private void OnDisable()
    {
        direction = Vector2.zero;
        moveAction?.Disable();
        moveAction?.Dispose();
        moveAction = null;
    }
}
