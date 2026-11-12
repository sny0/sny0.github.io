using System;

public static class Program
{
    public static void Main()
    {
        int startingHp = 10;
        var health = new Health(startingHp);
        int[] damages = { 3, 0, 9, 2 };

        for (int i = 0; i < damages.Length; i++)
        {
            int damage = damages[i];
            bool changed = health.ApplyDamage(damage);
            Console.WriteLine($"damage={damage}, hp={health.Current}, changed={changed}");
        }
    }
}
