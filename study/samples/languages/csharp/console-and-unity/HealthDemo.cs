using UnityEngine;

public sealed class HealthDemo : MonoBehaviour
{
    [SerializeField] private int startingHp = 10;

    private void Start()
    {
        var health = new Health(startingHp);
        int[] damages = { 3, 0, 9, 2 };

        for (int i = 0; i < damages.Length; i++)
        {
            int damage = damages[i];
            bool changed = health.ApplyDamage(damage);
            Debug.Log($"damage={damage}, hp={health.Current}, changed={changed}");
        }
    }
}
