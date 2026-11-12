using UnityEngine;

public sealed class HealthTarget : MonoBehaviour
{
    [SerializeField] private int startingHp = 10;
    private Health health;

    private void Awake()
    {
        health = new Health(startingHp);
        Debug.Log($"{gameObject.name}: hp={health.Current}", this);
    }

    public void TakeDamage(int amount, string source)
    {
        bool changed = health.ApplyDamage(amount);
        Debug.Log($"{source}: damage={amount}, hp={health.Current}, changed={changed}", this);
    }
}
