using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public sealed class DemoMover : MonoBehaviour
{
    [SerializeField, Min(0f)] private float speed = 2f;
    [SerializeField] private float endX = 3.2f;
    [SerializeField] private Transform marker;
    private Rigidbody2D body;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
    }

    private void FixedUpdate()
    {
        Vector2 current = body.position;
        if (current.x == endX)
        {
            return;
        }

        float nextX = Mathf.MoveTowards(current.x, endX, speed * Time.fixedDeltaTime);
        body.MovePosition(new Vector2(nextX, current.y));
    }

    [ContextMenu("Log Marker Position")]
    private void LogMarkerPosition()
    {
        if (marker == null)
        {
            Debug.LogWarning("Assign Marker on the Demo Mover component.", this);
            return;
        }

        Debug.Log($"Marker local={marker.localPosition:F2}, world={marker.position:F2}", this);
    }
}
