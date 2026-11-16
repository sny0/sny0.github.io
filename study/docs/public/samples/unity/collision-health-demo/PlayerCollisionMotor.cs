using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

[RequireComponent(typeof(Rigidbody2D))]
public sealed class PlayerCollisionMotor : MonoBehaviour
{
    [SerializeField] private InputActionReference move;
    [SerializeField, Min(0f)] private float speed = 2f;
    [SerializeField] private LayerMask wallLayers;
    [SerializeField, Min(0f)] private float skinWidth = 0.01f;

    private readonly List<RaycastHit2D> wallHits = new List<RaycastHit2D>(8);
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
            Debug.LogError("Assign HealthControls / Player / Move to Player Collision Motor.", this);
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
        Vector2 displacement = direction * (speed * Time.fixedDeltaTime);
        float requestedDistance = displacement.magnitude;
        Vector2 targetPosition = body.position;

        if (requestedDistance > 0f)
        {
            Vector2 travelDirection = displacement / requestedDistance;
            float travelDistance = requestedDistance;
            var wallFilter = new ContactFilter2D { useTriggers = false };
            wallFilter.SetLayerMask(wallLayers);

            // Leave room for the gap even when the wall is just beyond this step.
            int hitCount = body.Cast(travelDirection, wallFilter, wallHits, requestedDistance + skinWidth);
            if (hitCount > 0)
            {
                // Cast returns the nearest hit first.
                travelDistance = Mathf.Clamp(wallHits[0].distance - skinWidth, 0f, requestedDistance);
            }

            targetPosition += travelDirection * travelDistance;
        }

        body.MovePosition(targetPosition);
    }

    private void OnDisable()
    {
        direction = Vector2.zero;
        moveAction?.Disable();
        moveAction?.Dispose();
        moveAction = null;
    }
}
