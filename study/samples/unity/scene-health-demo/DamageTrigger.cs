using UnityEngine;

public sealed class DamageTrigger : MonoBehaviour
{
    [SerializeField] private int damage = 3;

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (!isActiveAndEnabled)
        {
            return;
        }

        HealthTarget target = other.GetComponent<HealthTarget>();
        if (target != null)
        {
            target.TakeDamage(damage, gameObject.name);
        }
    }
}
