public sealed class Health
{
    public int Current { get; private set; }

    public Health(int initialHp)
    {
        Current = initialHp;
        if (Current < 0)
        {
            Current = 0;
        }
    }

    public bool ApplyDamage(int amount)
    {
        if (amount <= 0 || Current == 0)
        {
            return false;
        }

        Current -= amount;
        if (Current < 0)
        {
            Current = 0;
        }
        return true;
    }
}
